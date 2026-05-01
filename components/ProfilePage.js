function ProfilePage() {
    const [user, setUser] = React.useState(null);
    const [orders, setOrders] = React.useState([]);
    const [favorites, setFavorites] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('orders');
    const [editForm, setEditForm] = React.useState({});
    const [toast, setToast] = React.useState('');
    const [cancelModal, setCancelModal] = React.useState({ isOpen: false, orderId: null });
    const [cancelReason, setCancelReason] = React.useState('Changed my mind');
    const [cancelOtherText, setCancelOtherText] = React.useState('');
    const [returnModal, setReturnModal] = React.useState({ isOpen: false, orderId: null });
    const [trackingModal, setTrackingModal] = React.useState({ isOpen: false, orderId: null, loading: false, data: null, error: null });
    const overridesRef = React.useRef({}); // Tracks local optimistic updates

    // Safe wrapper for DB calls to avoid unhandled fetch rejections bubbling up to error overlays
    const safeDbCall = async (fn, ...args) => {
        if (!fn) return null;
        try {
            const p = fn(...args);
            if (!p || typeof p.then !== 'function') return p;
            const result = await Promise.race([
                p,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 8000))
            ]);
            return result;
        } catch (e) {
            console.warn("Safe DB call handled error:", e?.message || e);
            return null;
        }
    };

    React.useEffect(() => {
        // Instant Dashboard Load: Check localStorage immediately
        const localPhone = localStorage.getItem('userPhone');
        const currentUser = window.AuthManager?.getUser() || (localPhone ? { phone: localPhone, name: 'Guest' } : null);

        if (!currentUser && !localPhone) {
            window.location.href = 'index.html';
            return;
        }

        setUser(currentUser);
        setEditForm({
            name: currentUser.name || '',
            email: currentUser.address?.email || '',
            houseNo: currentUser.address?.houseNo || '',
            roadName: currentUser.address?.roadName || '',
            city: currentUser.address?.city || '',
            pincode: currentUser.address?.pincode || '',
            state: currentUser.address?.state || ''
        });

        // Clear previous session data strictly to ensure Dynamic Rendering
        setOrders([]);
        setFavorites([]);

        let retryCount = 0;

        // Load fresh specific orders for this user silently in background
        const fetchOrders = async (isRetry = false) => {
            // UNIQUE DATA FETCH: Fetch strictly from phone number path
            const phone = currentUser.phone || localPhone;
            if (!phone) return;
            
            try {
                // Fetch Orders
                const res = await safeDbCall(window.trickleListObjects, `orders:${phone}`, 100, true);
                
                if (!res && !isRetry && retryCount === 0) {
                    // Connection Retry: Android browsers often drop initial connection
                    retryCount++;
                    setTimeout(() => fetchOrders(true), 3000);
                    return;
                }
                let fetchedItems = [];
                if (res && res.items) {
                    fetchedItems = res.items
                        .map(o => overridesRef.current[o.objectId] ? { ...o, objectData: { ...o.objectData, ...overridesRef.current[o.objectId] } } : o);
                }
                
                setOrders(fetchedItems);
                localStorage.setItem(`qryntox_orders_${phone}`, JSON.stringify(fetchedItems));

                // Fetch Favorites Strictly Isolated (With Deduplication)
                const favRes = await safeDbCall(window.trickleListObjects, `favorites:${phone}`, 100, true);
                if (favRes && favRes.items) {
                    const uniqueFavs = [];
                    const seenIds = new Set();
                    const map = {};
                    
                    favRes.items.forEach(item => {
                        const pid = item.objectData?.productId;
                        if (pid) {
                            if (!seenIds.has(pid)) {
                                seenIds.add(pid);
                                uniqueFavs.push(item);
                            } else {
                                // Background cleanup of duplicate db entries
                                safeDbCall(window.trickleDeleteObject, `favorites:${phone}`, item.objectId);
                            }
                            map[pid] = item.objectId;
                        }
                    });
                    
                    setFavorites(uniqueFavs);
                    localStorage.setItem(`favorites_map_${phone}`, JSON.stringify(map));
                    window.dispatchEvent(new Event('favoritesUpdated'));
                } else {
                    setFavorites([]);
                    localStorage.setItem(`favorites_map_${phone}`, JSON.stringify({}));
                    window.dispatchEvent(new Event('favoritesUpdated'));
                }
            } catch (e) {
                console.warn("Failed to load user-specific private dashboard", e);
            }
        };
        
        fetchOrders();
        
        const handleStorageChange = (e) => {
            if (e.key === `qryntox_orders_${currentUser.phone}`) {
                try {
                    setOrders(JSON.parse(e.newValue || '[]'));
                } catch(err) {}
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleConfirmReturn = async () => {
        if (!returnModal.orderId) return;
        const currentOrderId = returnModal.orderId;
        const targetOrder = orders.find(o => o.objectId === currentOrderId);
        
        overridesRef.current[currentOrderId] = { status: 'Return Requested' };
        setReturnModal({ isOpen: false, orderId: null });

        const userProfile = window.AuthManager?.getUser() || {};
        const phoneKey = userProfile.phone || 'guest';

        const allOrders = JSON.parse(localStorage.getItem(`qryntox_orders_${phoneKey}`) || '[]');
        const updatedOrders = allOrders.map(o => {
            if (o.objectId === currentOrderId) {
                return { ...o, objectData: { ...o.objectData, status: 'Return Requested' } };
            }
            return o;
        });
        localStorage.setItem(`qryntox_orders_${phoneKey}`, JSON.stringify(updatedOrders));
        
        setOrders(prev => prev.map(o => {
            if (o.objectId === currentOrderId) {
                return { ...o, objectData: { ...o.objectData, status: 'Return Requested' } };
            }
            return o;
        }));

        if (targetOrder) {
            // 1. Update Order Status in isolated orders path
            const dbPayload = { ...targetOrder.objectData, status: 'Return Requested' };
            await safeDbCall(window.trickleUpdateObject, targetOrder.objectType || `orders:${phoneKey}`, currentOrderId, dbPayload);
            
            // Build Product Details for display purposes if needed
            let items = [];
            try { items = JSON.parse(targetOrder.objectData.items || '[]'); } catch(e) {}
            const productDetails = items.map(i => `${i.id || 'N/A'} | ${i.name} | Size: ${i.size || 'N/A'} | Qty: ${i.quantity}`).join('\n');
            
            // Backwards compatibility with the global returns tracking
            const returnPayload = {
                customerName: targetOrder.objectData.customerName || userProfile.name || 'Guest',
                customerPhone: targetOrder.objectData.customerPhone || userProfile.phone || 'N/A',
                deliveryAddress: targetOrder.objectData.shippingAddress || 'N/A',
                productDetails: productDetails,
                orderDate: targetOrder.createdAt,
                orderId: targetOrder.objectData.orderId || targetOrder.objectId.slice(-8),
                status: 'Return Requested',
                originalOrderObjId: targetOrder.objectId
            };
            await safeDbCall(window.trickleCreateObject, 'returns', returnPayload);
            
            window.dispatchEvent(new Event('storage'));
            
            // Redirect after successful write
            window.open('https://api.whatsapp.com/send?phone=918590665753&text=Order Damage Verification Request', '_blank');
        }
    };

    const handleConfirmCancel = async () => {
        if (!cancelModal.orderId) return;
        
        const finalReason = cancelReason === 'Other' ? cancelOtherText : cancelReason;
        const currentOrderId = cancelModal.orderId;
        const targetOrder = orders.find(o => o.objectId === currentOrderId);
        
        // Record local override to prevent background fetch from reverting UI instantly
        overridesRef.current[currentOrderId] = { status: 'Cancelled', cancelReason: finalReason };

        // Close modal instantly
        setCancelModal({ isOpen: false, orderId: null });
        setCancelReason('Changed my mind');
        setCancelOtherText('');

        // Optimistic UI updates
        const userProfile = window.AuthManager?.getUser() || {};
        const phoneKey = userProfile.phone || 'guest';

        const allOrders = JSON.parse(localStorage.getItem(`qryntox_orders_${phoneKey}`) || '[]');
        const updatedOrders = allOrders.map(o => {
            if (o.objectId === currentOrderId) {
                return { ...o, objectData: { ...o.objectData, status: 'Cancelled', cancelReason: finalReason } };
            }
            return o;
        });
        localStorage.setItem(`qryntox_orders_${phoneKey}`, JSON.stringify(updatedOrders));
        
        setOrders(prev => prev.map(o => {
            if (o.objectId === currentOrderId) {
                return { ...o, objectData: { ...o.objectData, status: 'Cancelled', cancelReason: finalReason } };
            }
            return o;
        }));
        
        setToast('Order Cancelled Successfully');
        setTimeout(() => setToast(''), 3000);

        // Background DB process safely
        if (targetOrder) {
            const dbPayload = { ...targetOrder.objectData, status: 'Cancelled' };
            await safeDbCall(window.trickleUpdateObject, targetOrder.objectType || `orders:${phoneKey}`, currentOrderId, dbPayload);
            // Trigger a local storage event to notify other tabs immediately
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleTrackOrder = async (order) => {
        setTrackingModal({ isOpen: true, orderId: order.objectId, loading: true, data: null, error: null });
        
        try {
            let trackingData;
            
            // If Firebase is available (per instructions)
            if (window.firebase && window.firebase.functions) {
                const functions = window.firebase.functions();
                const getTrackingDetails = functions.httpsCallable('getTrackingDetails');
                const result = await getTrackingDetails({ orderId: order.objectId });
                trackingData = result.data;
            } else {
                // Mock simulation for preview
                await new Promise(resolve => setTimeout(resolve, 1500));
                trackingData = {
                    awb: 'AWB' + Math.floor(Math.random() * 1000000000),
                    courier: 'Delhivery Surface',
                    timeline: [
                        { stage: 'Order Placed', location: 'System', date: new Date(order.createdAt).toLocaleString(), completed: true },
                        { stage: 'Picked Up', location: 'Warehouse', date: new Date(Date.now() - 86400000 * 2).toLocaleString(), completed: true },
                        { stage: 'In Transit', location: 'Sorting Hub', date: new Date(Date.now() - 86400000).toLocaleString(), completed: true },
                        { stage: 'Out for Delivery', location: 'Local Hub', date: '', completed: false },
                        { stage: 'Delivered', location: '', date: '', completed: false }
                    ]
                };
            }
            
            setTrackingModal(prev => ({ ...prev, loading: false, data: trackingData }));
        } catch (err) {
            console.error("Tracking error:", err);
            setTrackingModal(prev => ({ ...prev, loading: false, error: 'Failed to fetch tracking details. Please try again later.' }));
        }
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        const updatedData = {
            name: editForm.name,
            address: {
                email: editForm.email,
                houseNo: editForm.houseNo,
                roadName: editForm.roadName,
                city: editForm.city,
                pincode: editForm.pincode,
                state: editForm.state
            }
        };
        window.AuthManager.updateProfile(updatedData);
        setUser(window.AuthManager.getUser());
        setToast('Profile Updated Successfully');
        setTimeout(() => setToast(''), 3000);
    };

    if (!user) return <div className="min-h-[50vh] flex items-center justify-center"><i className="icon-loader animate-spin text-2xl"></i></div>;

    const activeOrders = orders.filter(o => o.objectData.status !== 'Cancelled');
    const cancelledOrders = orders.filter(o => o.objectData.status === 'Cancelled');

    return (
        <div className="container mx-auto px-4 md:px-6 py-12 max-w-5xl w-full overflow-x-hidden" data-name="profile-page" data-file="components/ProfilePage.js">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 animate-slide-up">
                <div>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2 text-black uppercase tracking-widest">Dashboard</h1>
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Welcome back, {user.name} ({user.phone || 'N/A'})</p>
                </div>
                <button 
                    onClick={() => { window.location.href='products.html'; }}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black hover:text-gray-600 transition-colors border-b border-black pb-0.5"
                >
                    <i className="icon-shopping-bag text-sm"></i> Continue Shopping
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-10 animate-slide-up stagger-1">
                {/* Sidebar */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`min-h-[44px] text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        Order Archive
                    </button>
                    <button 
                        onClick={() => setActiveTab('favorites')}
                        className={`min-h-[44px] text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'favorites' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        My Favorites
                    </button>
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`min-h-[44px] text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'profile' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        Profile & Addresses
                    </button>
                    <a 
                        href="terms.html"
                        className="min-h-[44px] flex items-center text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 block"
                    >
                        Terms & Conditions
                    </a>
                    <button 
                        onClick={() => { 
                            if (window.AuthManager) window.AuthManager.logout(); 
                            localStorage.removeItem('userPhone'); 
                            window.location.reload(); 
                            setTimeout(() => { window.location.href = 'index.html'; }, 100);
                        }}
                        className="min-h-[44px] text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors bg-gray-50 text-red-500 hover:bg-red-50 hover:text-red-700 border border-gray-200 w-full"
                    >
                        LOGOUT
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'orders' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-serif font-bold uppercase tracking-widest mb-6 border-b border-gray-200 pb-4">Purchase History</h2>
                            
                            {orders.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-sm">
                                    <i className="icon-package text-4xl text-gray-300 mb-3"></i>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">You haven't placed any orders yet!</p>
                                    <a href="products.html" className="inline-block mt-6 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors">START SHOPPING</a>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <div className="space-y-6">
                                        {activeOrders.length === 0 && <p className="text-sm text-gray-500">No active orders.</p>}
                                        {activeOrders.map((order, orderIndex) => {
                                            let items = [];
                                            try { items = JSON.parse(order.objectData.items || '[]'); } catch(e) {}
                                            const canCancel = order.objectData.status === 'Awaiting Confirmation' || order.objectData.status === 'Processing' || order.objectData.status === 'Pending';
                                            return (
                                                <div key={`${order.objectId || 'ord'}-${orderIndex}`} className="bg-white border border-gray-200 rounded-sm p-6 hover:shadow-md transition-shadow relative w-[90%] max-w-[500px] mx-auto md:w-full md:max-w-none">
                                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                                                        <div>
                                                            <p className="text-xs font-mono font-bold text-gray-900 mb-1">ID: {order.objectData.orderId || order.objectId.slice(-8)}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{(window.formatDateIST ? window.formatDateIST(order.createdAt) : order.createdAt)}</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <span className="font-bold text-sm">{order.objectData.total}</span>
                                                            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                                                                {order.objectData.status || 'Processing'}
                                                            </span>
                                                            {canCancel && (
                                                                <button 
                                                                    onClick={() => setCancelModal({ isOpen: true, orderId: order.objectId })}
                                                                    className="min-h-[44px] flex items-center justify-center px-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors ml-2"
                                                                >
                                                                    Cancel Order
                                                                </button>
                                                            )}
                                                            {order.objectData.status?.toLowerCase() === 'delivered' && (
                                                                <button 
                                                                    onClick={() => setReturnModal({ isOpen: true, orderId: order.objectId })}
                                                                    className="min-h-[44px] flex items-center justify-center px-2 text-[10px] font-bold text-orange-500 uppercase tracking-widest hover:text-orange-700 transition-colors ml-2"
                                                                >
                                                                    Return Product
                                                                </button>
                                                            )}
                                                            {order.objectData.shiprocketOrderId && (
                                                                <button 
                                                                    onClick={() => handleTrackOrder(order)}
                                                                    className="min-h-[44px] flex items-center justify-center px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors ml-2 rounded-sm"
                                                                >
                                                                    <i className="icon-map-pin mr-2 text-xs"></i> Track Order
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {(!items || items.length === 0) ? null : items.map((item, idx) => {
                                                            if (!item) return null;
                                                            return (
                                                            <div key={`item-${item.id || idx}-${idx}`} className="flex items-center gap-4">
                                                                <div className="w-16 h-20 bg-gray-50 border border-gray-200 shrink-0 overflow-hidden">
                                                                    {item.image ? <img src={item.image} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} /> : null}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <a href={`product.html?id=${item.id}`} className="text-sm font-bold hover:underline mb-1 inline-block">{item.name || 'Product'}</a>
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Qty: {item.quantity || 1} {item.size ? `| Size: ${item.size}` : ''}</p>
                                                                </div>
                                                            </div>
                                                        )})}
                                                    </div>
                                                    
                                                    <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-sm border border-gray-200">
                                                        <div className="text-left">
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">Current Status</p>
                                                            <p className={`text-sm font-bold uppercase ${order.objectData.status === 'Delayed' ? 'text-red-600' : 'text-black'}`}>{order.objectData.status || 'Processing'}</p>
                                                        </div>
                                                        {order.objectData.deliveryNote && (
                                                            <div className="mt-4 pt-3 border-t border-gray-200 flex items-start gap-2">
                                                                <i className="icon-info text-gray-500 text-sm mt-0.5 shrink-0"></i>
                                                                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                                                    <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mr-2">Delivery Note:</span> 
                                                                    {order.objectData.deliveryNote}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {cancelledOrders.length > 0 && (
                                        <div className="space-y-6 pt-8 border-t border-gray-200">
                                            <h3 className="text-sm font-serif font-bold uppercase tracking-widest text-gray-500">Cancelled Orders</h3>
                                            {cancelledOrders.map((order, orderIndex) => {
                                                let items = [];
                                                try { items = JSON.parse(order.objectData.items || '[]'); } catch(e) {}
                                                return (
                                                    <div key={`${order.objectId || 'canc'}-${orderIndex}`} className="bg-white border border-gray-200 rounded-sm p-6 opacity-75 grayscale-[0.5] w-[90%] max-w-[500px] mx-auto md:w-full md:max-w-none">
                                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                                                            <div>
                                                                <p className="text-xs font-mono font-bold text-gray-900 mb-1">ID: {order.objectData.orderId || order.objectId.slice(-8)}</p>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{(window.formatDateIST ? window.formatDateIST(order.createdAt) : order.createdAt)}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold text-sm text-gray-400 line-through">{order.objectData.total}</span>
                                                                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                                                                    CANCELLED
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {(!items || items.length === 0) ? null : items.map((item, idx) => {
                                                                if (!item) return null;
                                                                return (
                                                                <div key={`canc-item-${item.id || idx}-${idx}`} className="flex items-center gap-4">
                                                                    <div className="w-12 h-16 bg-gray-50 border border-gray-200 shrink-0 overflow-hidden">
                                                                        {item.image ? <img src={item.image} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} /> : null}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-bold text-gray-500">{item.name || 'Product'}</p>
                                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty: {item.quantity || 1} {item.size ? `| Size: ${item.size}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-lg font-serif font-bold uppercase tracking-widest mb-6 border-b border-gray-200 pb-4">My Favorites</h2>
                            
                            {favorites.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 border border-gray-200 rounded-sm">
                                    <i className="icon-heart text-4xl text-gray-300 mb-3"></i>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No favorites yet.</p>
                                    <a href="products.html" className="inline-block mt-6 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors">BROWSE COLLECTION</a>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    {favorites.map((fav, favIndex) => {
                                        const p = fav.objectData?.productData;
                                        if (!p) return null;
                                        return (
                                            <a key={`${fav.objectId || 'fav'}-${favIndex}`} href={`product.html?id=${fav.objectData.productId}`} className="group block border border-gray-200 p-3 hover:border-black transition-colors rounded-sm bg-white">
                                                <div className="aspect-[3/4] bg-gray-50 mb-3 overflow-hidden">
                                                    {p.image && <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />}
                                                </div>
                                                <h3 className="text-xs font-bold text-black uppercase tracking-wider truncate mb-1">{p.name}</h3>
                                                <p className="text-[10px] text-gray-500 font-bold">{p.price}</p>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="bg-white border border-gray-200 p-8 rounded-sm animate-fade-in">
                            <h2 className="text-lg font-serif font-bold uppercase tracking-widest mb-6 border-b border-gray-200 pb-4">Identity Protocol</h2>
                            
                            <form onSubmit={handleSaveProfile} className="space-y-6 w-[90%] max-w-[500px] mx-auto md:w-full md:max-w-none pointer-events-auto relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                                        <input type="text" readOnly value={user.phone} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500 font-mono cursor-not-allowed rounded-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                                        <input type="text" required value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                                    </div>
                                    <div className="md:col-span-2 mt-4">
                                        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4">Default Delivery Address</h3>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">House No./Building</label>
                                        <input type="text" value={editForm.houseNo} onChange={e=>setEditForm({...editForm, houseNo: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Road Name/Area</label>
                                        <input type="text" value={editForm.roadName} onChange={e=>setEditForm({...editForm, roadName: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pincode</label>
                                        <input type="text" maxLength="6" value={editForm.pincode} onChange={e=>setEditForm({...editForm, pincode: e.target.value.replace(/\D/g, '')})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">City</label>
                                        <input type="text" value={editForm.city} onChange={e=>setEditForm({...editForm, city: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-6">
                                    <button type="submit" className="px-8 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors shadow-md rounded-sm">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-sm shadow-xl z-[110] animate-slide-up text-[10px] font-bold tracking-widest uppercase flex items-center gap-3">
                    <i className="icon-circle-check text-white"></i> {toast}
                </div>
            )}

            {/* Return Order Modal */}
            {returnModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-8 relative animate-slide-up shadow-2xl rounded-sm border border-gray-200">
                        <button onClick={() => setReturnModal({ isOpen: false, orderId: null })} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        
                        <h3 className="text-xl font-serif font-bold mb-4 text-black tracking-tight uppercase">Return Policy</h3>
                        <p className="text-sm font-medium text-black mb-8 leading-relaxed">
                            Returns accepted within 2 days ONLY for damaged products.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setReturnModal({ isOpen: false, orderId: null })}
                                className="min-h-[44px] flex-1 border border-gray-200 text-gray-600 py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors rounded-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmReturn}
                                className="min-h-[44px] flex-1 bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors rounded-sm"
                            >
                                Chat with Founder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Modal */}
            {trackingModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-6 relative animate-slide-up shadow-2xl rounded-sm border border-gray-200 max-h-[80vh] overflow-y-auto">
                        <button onClick={() => setTrackingModal({ isOpen: false, orderId: null, loading: false, data: null, error: null })} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        
                        <h3 className="text-xl font-serif font-bold mb-6 text-black tracking-tight uppercase flex items-center gap-2">
                            <i className="icon-package"></i> Track Shipment
                        </h3>

                        {trackingModal.loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <i className="icon-loader animate-spin text-3xl text-gray-400 mb-4"></i>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-4">Fetching Tracking Details...</p>
                            </div>
                        ) : trackingModal.error ? (
                            <div className="text-center py-8">
                                <i className="icon-circle-alert text-3xl text-red-500 mb-4"></i>
                                <p className="text-sm font-medium text-red-600">{trackingModal.error}</p>
                            </div>
                        ) : trackingModal.data ? (
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tracking AWB</p>
                                        <p className="text-sm font-mono font-bold">{trackingModal.data.awb}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Courier Partner</p>
                                        <p className="text-sm font-bold">{trackingModal.data.courier}</p>
                                    </div>
                                </div>
                                
                                <div className="pl-4 border-l-2 border-gray-200 space-y-6 relative py-2">
                                    {trackingModal.data.timeline.map((step, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${step.completed ? 'bg-black border-black' : 'bg-white border-gray-300'}`}></div>
                                            <div className="ml-4">
                                                <p className={`text-sm font-bold uppercase tracking-wide ${step.completed ? 'text-black' : 'text-gray-400'}`}>{step.stage}</p>
                                                {step.location && <p className="text-xs text-gray-500 mt-1">{step.location}</p>}
                                                {step.date && <p className="text-[10px] font-mono text-gray-400 mt-0.5">{step.date}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Cancel Order Modal */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md p-8 relative animate-slide-up shadow-2xl rounded-sm">
                        <button onClick={() => setCancelModal({ isOpen: false, orderId: null })} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        <h3 className="text-2xl font-serif font-bold mb-6 text-black tracking-tight border-b border-gray-100 pb-4">Why are you cancelling?</h3>
                        
                        <div className="space-y-4 mb-8">
                            {['Changed my mind', 'Found a better price elsewhere', 'Order taking too long', 'Incorrect shipping address', 'Other'].map(reason => (
                                <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="cancelReason" 
                                        value={reason} 
                                        checked={cancelReason === reason} 
                                        onChange={() => setCancelReason(reason)}
                                        className="w-4 h-4 accent-black cursor-pointer" 
                                    />
                                    <span className={`text-sm ${cancelReason === reason ? 'font-bold text-black' : 'font-medium text-gray-600 group-hover:text-black transition-colors'}`}>{reason}</span>
                                </label>
                            ))}
                            
                            {cancelReason === 'Other' && (
                                <div className="mt-2 pl-7 animate-slide-up">
                                    <input 
                                        type="text" 
                                        placeholder="Please specify..." 
                                        value={cancelOtherText}
                                        onChange={e => setCancelOtherText(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none transition-colors rounded-sm"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setCancelModal({ isOpen: false, orderId: null })}
                                className="min-h-[44px] flex-1 border border-gray-200 text-gray-600 py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors rounded-sm"
                            >
                                Nevermind
                            </button>
                            <button 
                                onClick={handleConfirmCancel}
                                disabled={cancelReason === 'Other' && !cancelOtherText.trim()}
                                className="min-h-[44px] flex-1 bg-red-600 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
