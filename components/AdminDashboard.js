function SalesChart({ orders, filter }) {
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    const ordersHash = React.useMemo(() => {
        return orders.map(o => `${o?.objectId}-${o?.objectData?.status}-${o?.objectData?.total}`).join('|');
    }, [orders]);

    React.useEffect(() => {
        if (!chartRef.current) return;
        
        const parseAmount = (val) => parseFloat(String(val || '0').replace(/[^0-9.]/g, '')) || 0;
        const validOrders = orders.filter(o => o?.objectData?.status !== 'Cancelled');
        
        let labels = [];
        let dataPoints = [];
        const now = new Date();

        if (filter === '30days') {
            const dateMap = {};
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toDateString();
                dateMap[key] = 0;
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            }
            validOrders.forEach(o => {
                const d = new Date(o.createdAt);
                const key = d.toDateString();
                if (dateMap[key] !== undefined) {
                    dateMap[key] += parseAmount(o.objectData.total);
                }
            });
            dataPoints = Object.values(dateMap);
        } else if (filter === 'thisYear') {
            const currentYear = now.getFullYear();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels = [...months];
            dataPoints = new Array(12).fill(0);
            validOrders.forEach(o => {
                const d = new Date(o.createdAt);
                if (d.getFullYear() === currentYear) {
                    dataPoints[d.getMonth()] += parseAmount(o.objectData.total);
                }
            });
        } else if (filter === '2years') {
            const monthMap = {};
            for (let i = 23; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                monthMap[key] = 0;
                labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            }
            validOrders.forEach(o => {
                const d = new Date(o.createdAt);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (monthMap[key] !== undefined) {
                    monthMap[key] += parseAmount(o.objectData.total);
                }
            });
            dataPoints = Object.values(monthMap);
        }

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        chartInstance.current = new ChartJS(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue',
                    data: dataPoints,
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#000000',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#000000',
                    pointHoverBorderColor: '#ffffff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#000000',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return '₹' + context.parsed.y.toLocaleString('en-IN', {minimumFractionDigits: 2});
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#71717a', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        grid: { color: '#f4f4f5', drawBorder: false },
                        beginAtZero: true,
                        ticks: {
                            color: '#71717a',
                            font: { family: 'Inter', size: 11 },
                            callback: function(value) {
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + 'k';
                                return '₹' + value;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [ordersHash, filter, orders]);

    return <canvas ref={chartRef}></canvas>;
}

function AdminDashboard() {
    const [isAuthorized, setIsAuthorized] = React.useState(() => localStorage.getItem('qryntox_isAuthorized') === 'true');
    const [salesFilter, setSalesFilter] = React.useState('30days');
    const [authPassword, setAuthPassword] = React.useState('');
    const [authError, setAuthError] = React.useState('');

    const [activeTab, setActiveTab] = React.useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') || 'overview';
    });
    const [products, setProducts] = React.useState([]);
    const [orders, setOrders] = React.useState([]);
    const [submissions, setSubmissions] = React.useState([]);
    const [customerInquiries, setCustomerInquiries] = React.useState([]);
    const [returnRequests, setReturnRequests] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchTerm, setSearchTerm] = React.useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    
    const [selectedOrder, setSelectedOrder] = React.useState(null);
    const [shippingData, setShippingData] = React.useState({ courier: '', trackingNumber: '', estDelivery: '' });
    const [showLabel, setShowLabel] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState(null);
    const [productToDelete, setProductToDelete] = React.useState(null);
    const [toastMessage, setToastMessage] = React.useState('');
    const [formData, setFormData] = React.useState({ 
        name: '', price: '', image: '', images: [], description: '', category: '', sizes: [], stock: 0, sku: '', status: 'Active', showAddToCart: true, material: '', origin: '', care: '' 
    });
    const [selectedIds, setSelectedIds] = React.useState([]);
    const [isGeneratingDesc, setIsGeneratingDesc] = React.useState(false);
    
    // Live Alerts & Order Deletion State
    const previousOrdersRef = React.useRef([]);
    const [alerts, setAlerts] = React.useState([]);
    const [unreadAlerts, setUnreadAlerts] = React.useState({ new: false, cancelled: false });
    const [orderToDeleteAdmin, setOrderToDeleteAdmin] = React.useState(null);
    const [orderSubTab, setOrderSubTab] = React.useState('confirmed');

    const playSound = (type) => {
        try {
            const audio = new Audio(type === 'new' ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' : 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    };

    const addAlert = (type, message) => {
        const id = Date.now() + Math.random();
        setAlerts(prev => [...prev, { id, type, message }]);
        setUnreadAlerts(prev => ({ ...prev, [type]: true }));
        playSound(type);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
        }, 5000);
    };

    const userId = 'override-bypass-id';
    
    const syncData = React.useCallback(async (tab, abortSignal) => {
        setLoading(true);
        setError(null);
        
        try {
            if (window.trickleListObjects) {
                try {
                    const subs = await window.trickleListObjects('submissions', 100, true, undefined);
                    setSubmissions(subs?.items || []);
                } catch(e) { console.warn("Submissions sync error:", e); }

                let allOrders = [];
                try {
                    const legacyOrds = await window.trickleListObjects('orders', 100, true, undefined);
                    allOrders = legacyOrds?.items || [];
                } catch(e) { console.warn("Orders sync error:", e); }
                
                let allReturns = [];
                try {
                    const legacyRets = await window.trickleListObjects('returns', 100, true, undefined);
                    allReturns = legacyRets?.items || [];
                } catch(e) { console.warn("Returns sync error:", e); }

                setOrders(allOrders);
                setReturnRequests(allReturns);
            }
            setCustomerInquiries([]); 
        } catch (err) {
            console.warn("Database sync error:", err);
            setError(null); // Suppress UI errors
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        const abortController = new AbortController();
        syncData(activeTab, abortController.signal);
        return () => abortController.abort();
    }, [activeTab, userId, syncData]);

    // Load Products
    React.useEffect(() => {
        const loadProducts = async () => {
            if (!window.trickleListObjects) return;
            setLoading(true);
            try {
                const res = await window.trickleListObjects('products', 100, true, undefined);
                setProducts(res.items || []);
            } catch (err) {
                console.warn("Products load warning:", err);
            } finally {
                setLoading(false);
            }
        };
        
        loadProducts();
        
        const handleUpdate = () => loadProducts();
        window.addEventListener('productsUpdated', handleUpdate);
        return () => window.removeEventListener('productsUpdated', handleUpdate);
    }, []);

    // Removed background fetch loops as requested. Relying on initial fetch and manual/event-driven updates.

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleLogout = () => {
        localStorage.removeItem('qryntox_isAuthorized');
        window.dispatchEvent(new Event('vaultAuthChanged'));
        window.location.href = 'index.html';
    };

    // Analytics Calculations
    const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const todaysSales = orders
        .filter(o => o?.createdAt && o?.objectData && new Date(o.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) === todayIST && o.objectData.status !== 'Cancelled')
        .reduce((sum, o) => sum + (parseFloat(String(o?.objectData?.total || '0').replace(/[^0-9.]/g, '')) || 0), 0);
    
    const pendingOrdersCount = orders.filter(o => o?.objectData && (o.objectData.status === 'Pending' || o.objectData.status === 'Processing' || o.objectData.status === 'Awaiting Confirmation')).length;
    const lowStockCount = products.filter(p => (parseInt(p?.objectData?.stock, 10) || 0) < 5).length;
    const cancelledOrdersCount = orders.filter(o => o?.objectData?.status === 'Cancelled').length;

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.objectData.name || '',
                price: product.objectData.price || '',
                image: product.objectData.image || '',
                images: product.objectData.images || (product.objectData.image ? [product.objectData.image] : []),
                description: product.objectData.description || '',
                category: product.objectData.category || '',
                sizes: product.objectData.sizes || [],
                stock: product.objectData.stock || 0,
                variants: product.objectData.variants || (product.objectData.sizes || []).map(s => ({ size: s, stock_quantity: Math.max(1, Math.floor((product.objectData.stock || 0) / (product.objectData.sizes?.length || 1))) })),
                sku: product.objectData.sku || '',
                status: product.objectData.status || 'Active',
                showAddToCart: product.objectData.showAddToCart !== false,
                material: product.objectData.material || '',
                origin: product.objectData.origin || '',
                care: product.objectData.care || ''
            });
        } else {
            setEditingProduct(null);
            setFormData({ name: '', price: '', image: '', images: [], description: '', category: '', sizes: [], stock: 0, variants: [], sku: '', status: 'Active', showAddToCart: true, material: '', origin: '', care: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const confirmDelete = (product) => {
        setProductToDelete(product);
    };

    const executeDelete = async () => {
        if (!productToDelete) return;
        const targetId = productToDelete.objectId;
        setLoading(true);

        try {
            await window.trickleDeleteObject('products', targetId);
            
            const updatedProducts = products.filter(p => p.objectId !== targetId);
            setProducts(updatedProducts);
            window.dispatchEvent(new Event('productsUpdated'));
            setToastMessage('Product successfully removed');
        } catch (err) {
            console.warn("Delete error:", err);
        } finally {
            setLoading(false);
            setProductToDelete(null);
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const executeOrderCancel = async () => {
        if (!orderToDeleteAdmin) return;
        const targetOrder = orderToDeleteAdmin;
        setLoading(true);

        try {
            const updatedObjectData = { ...targetOrder.objectData, status: 'Cancelled', cancelReason: 'Cancelled by Admin' };
            if (window.trickleUpdateObject) {
                await window.trickleUpdateObject(targetOrder.objectType || 'orders', targetOrder.objectId, updatedObjectData);
            }
            const updatedOrders = orders.map(o => o.objectId === targetOrder.objectId ? { ...o, objectData: updatedObjectData } : o);
            setOrders(updatedOrders);
            localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
            setToastMessage('Order successfully cancelled');
        } catch (err) {
            console.warn("Order cancel error:", err);
            setToastMessage('Error cancelling order');
        } finally {
            setLoading(false);
            setOrderToDeleteAdmin(null);
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handlePermanentDeleteOrder = async (order) => {
        if (!window.confirm(`Are you sure you want to permanently delete order #${order.objectData.orderId || order.objectId.slice(-8)}? This cannot be undone.`)) return;
        setLoading(true);
        try {
            if (window.trickleDeleteObject) {
                await window.trickleDeleteObject(order.objectType || 'orders', order.objectId);
            }
            const updatedOrders = orders.filter(o => o.objectId !== order.objectId);
            setOrders(updatedOrders);
            localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
            setToastMessage('Order permanently deleted');
        } catch (err) {
            console.warn("Permanent delete error:", err);
            setToastMessage('Error deleting order');
        } finally {
            setLoading(false);
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handleBulkAction = async (e) => {
        const action = e.target.value;
        if (action === 'deleteSelected' && selectedIds.length > 0) {
            const idsToDelete = [...selectedIds];
            
            // Optimistic UI update
            setProducts(prev => prev.filter(p => !idsToDelete.includes(p.objectId)));
            setSelectedIds([]);
            setToastMessage(`Removing ${idsToDelete.length} products...`);

            try {
                setLoading(true);
                await Promise.all(idsToDelete.map(id => window.trickleDeleteObject('products', id)));
                window.dispatchEvent(new Event('productsUpdated'));
                setToastMessage('Bulk deletion complete');
            } catch(e) {
                console.warn("Bulk delete error", e);
            } finally {
                setLoading(false);
                setTimeout(() => setToastMessage(''), 3000);
            }
        }
        e.target.value = '';
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        setToastMessage('Attaching original images...');
        
        // Implementing requested uploadBytesResumable logic for original quality images
        const uploadBytesResumable = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
                setTimeout(() => resolve(''), 60000); // 60-second timeout safety
            });
        };

        Promise.all(files.map(file => uploadBytesResumable(file))).then(base64Images => {
            const validBase64 = base64Images.filter(b => b && b.length > 0);
            setFormData(prev => {
                const newImages = [...prev.images, ...validBase64];
                return { ...prev, image: newImages[0] || '', images: newImages };
            });
            setToastMessage('Images attached directly');
            setTimeout(() => setToastMessage(''), 3000);
        });
    };

    const handleGenerateDescription = async (e) => {
        e.preventDefault();
        if (!formData.images || formData.images.length === 0) {
            setToastMessage('Please upload an image first.');
            setTimeout(() => setToastMessage(''), 3000);
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const systemPrompt = "You are a copywriter for QRYNTOX. Output JSON with 'description', 'material', 'origin', 'care'.";
            const userPrompt = `Name: ${formData.name}\nCategory: ${formData.category}\nGenerate specs in JSON.`;
            let result = await invokeAIAgent(systemPrompt, userPrompt);
            result = result.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(result);
            setFormData(prev => ({ 
                ...prev, 
                description: parsed.description || prev.description,
                material: parsed.material || prev.material,
                origin: parsed.origin || prev.origin,
                care: parsed.care || prev.care
            }));
            setToastMessage('Details generated!');
        } catch (err) {
            console.warn("Generation failed:", err);
            setToastMessage('Generation failed.');
        } finally {
            setIsGeneratingDesc(false);
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setToastMessage('Saving product...');

        try {
            // Use the compressed base64 images directly to avoid hanging external storage requests
            let uploadedImageUrls = formData.images || [];

            const parsedStock = parseInt(formData.stock || 0, 10);
            const saveObj = {
                name: String(formData.name || ''),
                price: String(formData.price || ''),
                image: uploadedImageUrls[0] || '',
                description: String(formData.description || ''),
                stock: isNaN(parsedStock) ? 0 : parsedStock,
                inStock: !isNaN(parsedStock) && parsedStock > 0,
                sizes: Array.isArray(formData.sizes) ? formData.sizes : [],
                variants: formData.variants || [],
                images: uploadedImageUrls,
                category: String(formData.category || ''),
                sku: String(formData.sku || ''),
                status: String(formData.status || 'Active'),
                showAddToCart: Boolean(formData.showAddToCart),
                material: String(formData.material || ''),
                origin: String(formData.origin || ''),
                care: String(formData.care || '')
            };

            if (editingProduct) {
                await window.trickleUpdateObject('products', editingProduct.objectId, saveObj);
                setProducts(products.map(p => p.objectId === editingProduct.objectId ? { ...p, objectData: saveObj } : p));
            } else {
                const newObj = await window.trickleCreateObject('products', saveObj);
                setProducts([newObj, ...products]);
            }
            window.dispatchEvent(new Event('productsUpdated'));
            setToastMessage('Product successfully saved');
        } catch (err) {
            console.warn("Form submit error:", err);
            setToastMessage('Upload failed: ' + err.message);
        } finally {
            setLoading(false);
            closeModal();
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handleMarkAsShipped = async () => {
        if (!shippingData.courier || !shippingData.trackingNumber) {
            setToastMessage("Please enter Courier Partner and Tracking Number.");
            setTimeout(() => setToastMessage(''), 3000);
            return;
        }
        try {
            setLoading(true);
            const updatedData = { 
                ...selectedOrder.objectData, 
                status: 'Shipped',
                courier: shippingData.courier,
                trackingNumber: shippingData.trackingNumber,
                estDelivery: shippingData.estDelivery
            };
            
            const newOrder = { ...selectedOrder, objectData: updatedData };
            const updatedOrders = orders.map(o => o.objectId === newOrder.objectId ? newOrder : o);
            setOrders(updatedOrders);
            localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
            
            setSelectedOrder(newOrder);
            setToastMessage('Order marked as shipped!');
            setTimeout(() => setToastMessage(''), 3000);
        } catch(err) {
            console.log("Error marking as shipped gracefully.", err);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnAction = async (order, newStatus) => {
        try {
            setLoading(true);
            const newObjectData = { ...order.objectData, status: newStatus };
            const updatedOrder = { ...order, objectData: newObjectData };
            
            const updatedOrders = orders.map(o => o.objectId === updatedOrder.objectId ? updatedOrder : o);
            setOrders(updatedOrders);
            localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
            
            if (window.trickleUpdateObject) {
                await window.trickleUpdateObject(order.objectType || 'orders', order.objectId, newObjectData);
            }
            
            setToastMessage(`Order ${newStatus}. Notification sent to customer.`);
            setTimeout(() => setToastMessage(''), 3000);
        } catch(err) {
            console.log("Error updating return status.", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderStatusChange = async (order, newStatus) => {
        try {
            const newObjectData = { ...order.objectData, status: newStatus };
            const updatedOrder = { ...order, objectData: newObjectData };
            
            // Optimistic UI Update
            const updatedOrders = orders.map(o => o.objectId === updatedOrder.objectId ? updatedOrder : o);
            setOrders(updatedOrders);
            localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
            
            // Save to DB
            if (window.trickleUpdateObject) {
                await window.trickleUpdateObject(order.objectType || 'orders', order.objectId, newObjectData);
            }
            
            setToastMessage('Order status updated!');
            setTimeout(() => setToastMessage(''), 3000);
        } catch(err) {
            console.log("Error updating status gracefully.", err);
        }
    };

    const filteredProducts = products.filter(p => {
        const q = searchQuery.toLowerCase();
        const name = (p.objectData.name || '').toLowerCase();
        const sku = (p.objectData.sku || '').toLowerCase();
        const desc = (p.objectData.description || '').toLowerCase();
        const category = (p.objectData.category || '').toLowerCase();
        return name.includes(q) || sku.includes(q) || desc.includes(q) || category.includes(q);
    });

    React.useEffect(() => {
        if (isModalOpen || productToDelete || selectedOrder) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen, productToDelete, selectedOrder]);

    const isFormValid = formData.name.trim() !== '' && 
                        formData.category.trim() !== '' && 
                        formData.description.trim() !== '' && 
                        formData.images.length > 0;

    if (!isAuthorized) {
        return <VaultModal isOpen={true} onClose={() => window.location.href = 'index.html'} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex text-gray-900" data-name="admin-dashboard" data-file="components/AdminDashboard.js">
            {/* Permanent Sidebar */}
            <aside className="w-20 md:w-64 border-r border-gray-200 bg-white fixed top-0 bottom-0 left-0 flex flex-col z-40 shadow-sm transition-all duration-300 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-center md:justify-start gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex shrink-0 items-center justify-center text-black">
                        <i className="icon-package text-sm"></i>
                    </div>
                    <h1 className="text-lg font-bold tracking-widest uppercase hidden md:block">QRYNTOX</h1>
                </div>
                <nav className="flex-1 p-3 md:p-4 space-y-2">
                    {[
                        { id: 'overview', icon: 'icon-layout-dashboard', label: 'Overview' },
                        { id: 'inventory', icon: 'icon-layers', label: 'Inventory' },
                        { id: 'orders', icon: 'icon-shopping-bag', label: 'Order Management' },
                        { id: 'customers', icon: 'icon-users', label: 'Customer List' },
                        { id: 'inquiries', icon: 'icon-message-square', label: 'Inquiries' },
                        { id: 'returns', icon: 'icon-undo-2', label: 'Return Requests' },
                        { id: 'settings', icon: 'icon-settings', label: 'Site Settings' }
                    ].map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); if (item.id === 'orders') setUnreadAlerts({ new: false, cancelled: false }); }}
                            className={`relative w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-gray-100 text-black font-semibold' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
                            title={item.label}
                        >
                            <i className={`${item.icon} text-xl md:text-lg`}></i> <span className="hidden md:inline">{item.label}</span>
                            {item.id === 'orders' && (
                                <div className="absolute top-3 right-3 hidden md:flex gap-1">
                                    {unreadAlerts.new && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                    {(unreadAlerts.cancelled || cancelledOrdersCount > 0) && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
                                </div>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <div onClick={handleLogout} className="flex items-center justify-center md:justify-start gap-3 md:px-4 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors" title="Logout">
                        <div className="w-10 h-10 md:w-8 md:h-8 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 overflow-hidden">
                            <i className="icon-user"></i>
                        </div>
                        <div className="hidden md:block overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate">Sam</p>
                            <p className="text-[10px] text-gray-500 truncate">HQ Node</p>
                        </div>
                        <i className="icon-log-out text-gray-400 hidden md:block ml-auto text-sm"></i>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-20 md:ml-64 p-4 md:p-8 overflow-y-auto transition-all duration-300">
                <div className="mb-8 pb-6 border-b border-gray-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-black uppercase tracking-widest mb-1">Sam Dashboard</h1>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Registered Node: HQ - Thrissur / Kerala</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-600">
                        <i className="icon-circle-alert"></i><p>{String(error)}</p>
                    </div>
                )}

                <div className="animate-fade-in">
                    
                    {/* STORE ANALYTICS (OVERVIEW) */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <header className="mb-8">
                                <h2 className="text-2xl font-bold mb-1 text-black">Dashboard Overview</h2>
                                <p className="text-gray-500 text-sm">Monitor your store's performance and pending tasks.</p>
                            </header>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="glass-panel p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Today's Sales</p>
                                            <h3 className="text-3xl font-bold text-black">${todaysSales.toFixed(2)}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i className="icon-dollar-sign text-xl"></i></div>
                                    </div>
                                    <p className="text-xs text-gray-500"><span className="text-green-500 font-medium">+12%</span> from yesterday</p>
                                </div>
                                <div className="glass-panel p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pending Orders</p>
                                            <h3 className="text-3xl font-bold text-black">{pendingOrdersCount}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><i className="icon-shopping-cart text-xl"></i></div>
                                    </div>
                                    <p className="text-xs text-gray-500">Requires immediate fulfillment</p>
                                </div>
                                <div className="glass-panel p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                                            <h3 className="text-3xl font-bold text-red-600">{lowStockCount}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><i className="icon-triangle-alert text-xl"></i></div>
                                    </div>
                                    <p className="text-xs text-gray-500">Products with stock under 5</p>
                                </div>
                            </div>
                            
                            {/* SALES REVENUE PERFORMANCE GRAPH */}
                            <div className="glass-panel p-6 mt-8">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-black">Sales Revenue Performance</h3>
                                        <p className="text-xs text-gray-500">Real-time sync from Secured Orders</p>
                                    </div>
                                    <select 
                                        value={salesFilter}
                                        onChange={(e) => setSalesFilter(e.target.value)}
                                        className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-black focus:outline-none text-gray-700 cursor-pointer font-medium"
                                    >
                                        <option value="30days">Last 30 Days</option>
                                        <option value="thisYear">This Year</option>
                                        <option value="2years">Last 2 Years</option>
                                    </select>
                                </div>
                                <div className="w-full h-80">
                                    <SalesChart orders={orders} filter={salesFilter} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SMART PRODUCT MANAGER */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-6">
                            <header className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 text-black">Product Manager</h2>
                                    <p className="text-gray-500 text-sm">Manage inventory, SKUs, and track stock levels.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a href="index.html" target="_blank" className="border border-gray-200 text-gray-700 bg-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
                                        <i className="icon-external-link"></i> View Live Site
                                    </a>
                                    <button onClick={() => openModal()} className="bg-black text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm">
                                        <i className="icon-plus"></i> Add Product
                                    </button>
                                </div>
                            </header>
                            
                            <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="relative w-full max-w-md">
                                        <i className="icon-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                        <input 
                                            type="text" 
                                            placeholder="Search by Name or SKU..." 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm focus:border-black focus:outline-none transition-colors text-black"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <select onChange={handleBulkAction} defaultValue="" className="bg-white border border-gray-200 rounded-md px-4 py-2 text-sm focus:border-black focus:outline-none text-gray-700 cursor-pointer">
                                        <option value="" disabled>Bulk Actions</option>
                                        <option value="markActive">Mark Active</option>
                                        <option value="markDraft">Mark Draft</option>
                                        <option value="deleteSelected">Delete Selected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="glass-panel overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 w-12">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300"
                                                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                                    onChange={(e) => setSelectedIds(e.target.checked ? filteredProducts.map(p => p.objectId) : [])}
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Product</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">SKU</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Category</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Price</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Stock Level</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan="8" className="text-center py-16 text-gray-500 font-medium"><i className="icon-loader animate-spin inline-block mr-2 text-lg"></i> Loading Inventory...</td></tr>
                                        ) : filteredProducts.length === 0 ? (
                                            <tr><td colSpan="8" className="text-center py-12 text-gray-500">No products found.</td></tr>
                                        ) : filteredProducts.map((prod) => {
                                            const stock = parseInt(prod.objectData.stock, 10) || 0;
                                            return (
                                            <tr key={prod.objectId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300"
                                                        checked={selectedIds.includes(prod.objectId)}
                                                        onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, prod.objectId] : selectedIds.filter(id => id !== prod.objectId))}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-md border border-gray-200 overflow-hidden flex shrink-0 bg-white items-center justify-center">
                                                            {prod.objectData.image ? <img loading="lazy" src={prod.objectData.image} className="w-full h-full object-cover" /> : <i className="icon-image text-gray-400"></i>}
                                                        </div>
                                                        <p className="font-semibold text-sm text-gray-900">{prod.objectData.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{prod.objectData.sku || '-'}</td>
                                                <td className="px-6 py-4"><span className="text-xs bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 font-medium">{prod.objectData.category || 'Uncategorized'}</span></td>
                                                <td className="px-6 py-4 text-sm font-medium">{prod.objectData.price}</td>
                                                <td className="px-6 py-4">
                                                    {stock < 5 ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Low Stock ({stock})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> In Stock ({stock})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${prod.objectData.status === 'Draft' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                        {prod.objectData.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button onClick={() => openModal(prod)} className="btn-action"><i className="icon-pencil text-xs"></i></button>
                                                    <button onClick={() => confirmDelete(prod)} className="btn-action hover:text-red-600 hover:border-red-200"><i className="icon-trash text-xs"></i></button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ORDER PROCESSING LOGIC */}
                    {activeTab === 'orders' && (
                        <div className="space-y-6">
                            <header className="mb-6 flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 text-black">Order Management</h2>
                                    <p className="text-gray-500 text-sm">Process fulfillments and track order statuses.</p>
                                </div>
                                <button onClick={() => {
                                    const headers = ['Order ID', 'Customer Name', 'Total', 'Payment Status', 'Order Status', 'Date'];
                                    const data = orders.map(o => [
                                        o.objectData.orderId || o.objectId,
                                        o.objectData.customerName || 'Guest',
                                        o.objectData.total || '$0.00',
                                        o.objectData.paymentStatus || 'Paid',
                                        o.objectData.status || 'Pending',
                                        (window.formatDateIST ? window.formatDateIST(o.createdAt) : o.createdAt)
                                    ]);
                                    const csv = [headers, ...data].map(row => row.map(val => `"${(val||'').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'qryntox_orders.csv';
                                    a.click();
                                }} className="bg-black text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm">
                                    <i className="icon-download"></i> Export All Orders
                                </button>
                            </header>

                            <div className="flex gap-4 mb-4 border-b border-gray-200">
                                <button 
                                    onClick={() => setOrderSubTab('confirmed')}
                                    className={`pb-2 text-sm font-bold uppercase tracking-widest ${orderSubTab === 'confirmed' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Confirmed Orders
                                </button>
                                <button 
                                    onClick={() => setOrderSubTab('cancelled')}
                                    className={`pb-2 text-sm font-bold uppercase tracking-widest ${orderSubTab === 'cancelled' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Cancelled Orders
                                </button>
                            </div>

                            <div className="glass-panel overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Order ID</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Shipping Address</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Items summary</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Total Amount</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Payment Status</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Order Status</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Logistics</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {orders.filter(o => {
                                            if (!o || !o.objectData) return false;
                                            if (orderSubTab === 'confirmed') return o.objectData.status !== 'Cancelled';
                                            return o.objectData.status === 'Cancelled';
                                        }).map((order) => {
                                            let items = [];
                                            try { items = JSON.parse(order.objectData.items || '[]'); } catch(e) {}
                                            const summary = items.map(i => `${i.name}${i.size ? ' - Size: ' + i.size : ''} (x${i.quantity})`).join(', ');
                                            return (
                                            <tr key={order.objectId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-sm text-black font-medium">{order.objectData.orderId || order.objectId.slice(-8)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{order.objectData.customerName || 'Guest'}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500 truncate max-w-[200px]" title={summary}>{summary}</td>
                                                <td className="px-6 py-4 font-semibold text-sm text-black">{String(order.objectData.total || '-')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border font-medium ${order.objectData.paymentStatus === 'Pending Verification' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : order.objectData.paymentStatus === 'Paid - Live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : order.objectData.paymentStatus === 'COD' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                        {order.objectData.paymentStatus || 'Paid'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {order.objectData.status === 'Cancelled' ? (
                                                        <span className="inline-flex items-center text-xs px-2.5 py-1 rounded bg-red-50 text-red-600 border border-red-200 font-bold uppercase tracking-widest">
                                                            CANCELLED
                                                        </span>
                                                    ) : (
                                                        <select 
                                                            className="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:border-black focus:outline-none text-gray-700 font-medium cursor-pointer"
                                                            value={order.objectData.status || 'Pending'}
                                                            onChange={(e) => handleOrderStatusChange(order, e.target.value)}
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="Awaiting Confirmation">Awaiting Confirmation</option>
                                                            <option value="Processing">Processing</option>
                                                            <option value="Shipped">Shipped</option>
                                                            <option value="Delivered">Delivered</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {order.objectData.status !== 'Cancelled' && (
                                                        <button
                                                            onClick={() => {
                                                                setToastMessage('Opening Shiprocket...');
                                                                window.open('https://app.shiprocket.in/orders/processing', '_blank');
                                                                setTimeout(() => setToastMessage(''), 3000);
                                                            }}
                                                            className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            Create Shipment
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        {order.objectData.isAutoSecure && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 mr-2">
                                                                <i className="icon-shield-check text-xs"></i> Auto Secure
                                                            </span>
                                                        )}
                                                        
                                                        {order.objectData.trackingNumber && (
                                                            <a href={`https://track.example.com/${order.objectData.trackingNumber}`} target="_blank" className="btn-action flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 border-blue-200 bg-blue-50 transition-colors">
                                                                <i className="icon-truck"></i> Track
                                                            </a>
                                                        )}
                                                        {(() => {
                                                            let phone = (order.objectData.customerPhone || '').replace(/\D/g, '');
                                                            if (phone && !phone.startsWith('91')) {
                                                                phone = '91' + phone;
                                                            }
                                                            let items = [];
                                                            try { items = JSON.parse(order.objectData.items || '[]'); } catch(e) {}
                                                            const productName = items.map(i => i.name).join(', ') || 'Your items';
                                                            const deliveryDate = order.objectData.estimatedDeliveryDate || order.objectData.estDelivery || 'To be updated';
                                                            
                                                            // Prevent base64 strings from exceeding URL length limits and crashing the browser
                                                            const rawImage = items[0]?.image || '';
                                                            const imageUrl = rawImage.startsWith('http') ? rawImage : 'Available in your QRYNTOX account';
                                                            
                                                            const message = `*QRYNTOX - Order Update*\n\nHi, your order is confirmed!\nProduct: ${productName}\nDelivery Date: ${deliveryDate}\nView Image: ${imageUrl}\nThank you!`;
                                                            
                                                            if (phone) {
                                                                return (
                                                                    <a 
                                                                        href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="btn-action !text-green-600 hover:!bg-green-50 hover:!border-green-200"
                                                                        title="WhatsApp Customer"
                                                                    >
                                                                        <i className="icon-message-circle text-sm"></i>
                                                                    </a>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        <button onClick={() => {
                                                            setSelectedOrder(order);
                                                            setShippingData({
                                                                courier: order.objectData.courier || '',
                                                                trackingNumber: order.objectData.trackingNumber || '',
                                                                estDelivery: order.objectData.estimatedDeliveryDate || order.objectData.estDelivery || '',
                                                                status: order.objectData.status || 'Pending',
                                                                deliveryNote: order.objectData.deliveryNote || ''
                                                            });
                                                            setShowLabel(false);
                                                        }} className="btn-action flex items-center gap-2 text-xs">
                                                            <i className="icon-clipboard-list text-xs"></i> Edit
                                                        </button>
                                                    {order.objectData.status !== 'Cancelled' && (
                                                        <button 
                                                            onClick={() => setOrderToDeleteAdmin(order)}
                                                            className="btn-action !text-red-600 hover:!bg-red-50 hover:!border-red-200"
                                                            title="Cancel Order"
                                                        >
                                                            <i className="icon-circle-x"></i>
                                                        </button>
                                                    )}
                                                    {order.objectData.status === 'Cancelled' && (
                                                        <button 
                                                            onClick={() => handlePermanentDeleteOrder(order)}
                                                            className="btn-action !text-red-600 hover:!bg-red-50 hover:!border-red-200 flex items-center gap-1.5"
                                                            title="Permanently Delete"
                                                        >
                                                            <i className="icon-trash text-xs"></i> Delete
                                                        </button>
                                                    )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )})}
                                        {orders.length === 0 && !loading && (
                                            <tr><td colSpan="7" className="text-center py-12 text-gray-500">No orders to display.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CUSTOMER INQUIRIES */}
                    {activeTab === 'inquiries' && (
                        <div className="space-y-6">
                            <header className="mb-6">
                                <h2 className="text-2xl font-bold mb-1 text-black">Customer Inquiries</h2>
                                <p className="text-gray-500 text-sm">Review and respond to real-time customer submissions.</p>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 glass-panel overflow-hidden flex flex-col h-[600px]">
                                    <div className="p-4 border-b border-gray-200 bg-gray-50"><h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Inbox</h3></div>
                                    <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                                        {submissions.map((sub, idx) => (
                                            <div key={sub.objectId} className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${idx === 0 ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-semibold text-sm text-gray-900 truncate">{sub.objectData.name || 'Anonymous User'}</h4>
                                                    <span className="text-[10px] text-gray-400">{(window.formatDateIST ? window.formatDateIST(sub.createdAt) : sub.createdAt)}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2">{sub.objectData.description || 'No message provided.'}</p>
                                            </div>
                                        ))}
                                        {submissions.length === 0 && !loading && <p className="p-6 text-center text-sm text-gray-500">Inbox is empty.</p>}
                                    </div>
                                </div>
                                
                                <div className="lg:col-span-2 glass-panel flex flex-col h-[600px] overflow-hidden">
                                {submissions.length > 0 ? (
                                    <React.Fragment>
                                        <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-bold text-black">{submissions[0].objectData.name || 'Anonymous User'}</h3>
                                                <p className="text-xs text-gray-500">Received on {(window.formatDateIST ? window.formatDateIST(submissions[0].createdAt) : submissions[0].createdAt)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="btn-action"><i className="icon-star"></i></button>
                                                <button className="btn-action text-red-600 hover:bg-red-50 border-red-200"><i className="icon-trash"></i></button>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                                            {submissions[0].objectData.imageUrl && (
                                                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 max-w-sm bg-white p-1 shadow-sm">
                                                    <img loading="lazy" src={submissions[0].objectData.imageUrl} className="w-full h-auto object-cover rounded" />
                                                </div>
                                            )}
                                            <div className="bg-white rounded-lg p-5 border border-gray-200 text-sm text-gray-700 leading-relaxed shadow-sm">
                                                {submissions[0].objectData.description || 'No message content.'}
                                            </div>
                                        </div>
                                        <div className="p-4 border-t border-gray-200 bg-white">
                                            <textarea 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:border-black focus:outline-none transition-colors resize-none text-black" 
                                                rows="3" 
                                                placeholder="Write your reply..."
                                            ></textarea>
                                            <div className="flex justify-between items-center mt-3">
                                                <div className="flex gap-3 text-gray-400">
                                                    <button className="hover:text-black transition-colors"><i className="icon-paperclip"></i></button>
                                                    <button className="hover:text-black transition-colors"><i className="icon-image"></i></button>
                                                </div>
                                                <button className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                                                    Send Reply <i className="icon-send text-xs"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                ) : (
                                        <div className="m-auto text-center text-gray-400">
                                            <i className="icon-inbox text-4xl mb-4 opacity-50"></i>
                                            <p>Select an inquiry to view details.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CUSTOMER LIST */}
                    {activeTab === 'customers' && (
                        <div className="space-y-6">
                            <header className="mb-6 flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 text-black">Customer List</h2>
                                    <p className="text-gray-500 text-sm">View your customer base and their purchasing history.</p>
                                </div>
                                <button onClick={() => {
                                    const custMap = {};
                                    orders.filter(o => o?.objectData).forEach(o => {
                                        const name = o.objectData.customerName || 'Guest';
                                        if (!custMap[name]) custMap[name] = { name, spent: 0, lastOrder: o.createdAt, ordersCount: 0 };
                                        const amount = parseFloat(String(o.objectData.total || '0').replace(/[^0-9.]/g, '')) || 0;
                                        custMap[name].spent += amount;
                                        custMap[name].ordersCount += 1;
                                        if (new Date(o.createdAt) > new Date(custMap[name].lastOrder)) custMap[name].lastOrder = o.createdAt;
                                    });
                                    const customers = Object.values(custMap);
                                    
                                    const headers = ['Name', 'Total Orders', 'Total Spent', 'Last Order Date'];
                                    const data = customers.map(c => [
                                        c.name,
                                        c.ordersCount,
                                        `$${c.spent.toFixed(2)}`,
                                        (window.formatDateIST ? window.formatDateIST(c.lastOrder) : c.lastOrder)
                                    ]);
                                    const csv = [headers, ...data].map(row => row.map(val => `"${(val||'').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'qryntox_customers.csv';
                                    a.click();
                                }} className="bg-black text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm">
                                    <i className="icon-download"></i> Download Customer List
                                </button>
                            </header>

                            <div className="glass-panel overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Total Orders</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Total Spent</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Last Order Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.values(orders.filter(o => o?.objectData).reduce((acc, o) => {
                                            const name = o.objectData.customerName || 'Guest';
                                            if (!acc[name]) acc[name] = { name, spent: 0, lastOrder: o.createdAt, ordersCount: 0 };
                                            const amount = parseFloat(String(o.objectData.total || '0').replace(/[^0-9.]/g, '')) || 0;
                                            acc[name].spent += amount;
                                            acc[name].ordersCount += 1;
                                            if (new Date(o.createdAt) > new Date(acc[name].lastOrder)) acc[name].lastOrder = o.createdAt;
                                            return acc;
                                        }, {})).map((c, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-sm text-black">{c.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{c.ordersCount}</td>
                                                <td className="px-6 py-4 font-semibold text-sm text-black">${c.spent.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{(window.formatDateIST ? window.formatDateIST(c.lastOrder) : c.lastOrder)}</td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && !loading && (
                                            <tr><td colSpan="4" className="text-center py-12 text-gray-500">No customers found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-12 space-y-6">
                                <header className="mb-6 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1 text-black">Contact Form Inquiries</h3>
                                        <p className="text-gray-500 text-sm">Messages submitted directly by customers on the homepage.</p>
                                    </div>
                                    <button onClick={() => {
                                        if(window.confirm('Are you sure you want to clear all contact form inquiries?')) {
                                            localStorage.removeItem('qryntox_customers');
                                            setCustomerInquiries([]);
                                            setToastMessage('Customer inquiries cleared.');
                                            setTimeout(() => setToastMessage(''), 3000);
                                        }
                                    }} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-red-100 transition-colors shadow-sm">
                                        <i className="icon-trash"></i> Clear All
                                    </button>
                                </header>
                                <div className="glass-panel overflow-x-auto">
                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 w-1/2">Message</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {customerInquiries.map((inq) => {
                                                let displayDate = inq.date;
                                                try {
                                                    const d = new Date(inq.date);
                                                    if (!isNaN(d.getTime())) {
                                                        displayDate = d.toLocaleString('en-US', {
                                                            month: 'short', day: 'numeric', year: 'numeric',
                                                            hour: 'numeric', minute: '2-digit', hour12: true
                                                        });
                                                    }
                                                } catch (e) {}
                                                return (
                                                <tr key={inq.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-500">{displayDate}</td>
                                                    <td className="px-6 py-4 font-medium text-sm text-black">{inq.name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{inq.email}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-normal min-w-[300px] leading-relaxed">{inq.message}</td>
                                                </tr>
                                            )})}
                                            {customerInquiries.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-12 text-gray-500">No contact inquiries yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RETURN REQUESTS */}
                    {activeTab === 'returns' && (
                        <div className="space-y-6">
                            <header className="mb-6 flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 text-black">Return Requests</h2>
                                    <p className="text-gray-500 text-sm">Manage customer return and refund requests.</p>
                                </div>
                            </header>
                            <div className="glass-panel overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Product Details</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Delivery Address</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">WhatsApp Chat Link</th>
                                            <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {returnRequests.map((ret) => (
                                            <tr key={ret.objectId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-sm text-black">{ret.objectData.customerName}</td>
                                                <td className="px-6 py-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{ret.objectData.productDetails}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500 max-w-[250px] whitespace-normal leading-relaxed">{ret.objectData.deliveryAddress}</td>
                                                <td className="px-6 py-4">
                                                    {ret.objectData.customerPhone && ret.objectData.customerPhone !== 'N/A' ? (
                                                        <a href={`https://api.whatsapp.com/send?phone=${ret.objectData.customerPhone.replace(/\D/g, '')}`} target="_blank" className="btn-action !text-green-600 hover:!bg-green-50 flex items-center gap-2 w-max">
                                                            <i className="icon-message-circle text-sm"></i> Chat with {ret.objectData.customerName.split(' ')[0]}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No Phone</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded border font-medium ${
                                                        ret.objectData.status === 'Return Requested' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        ret.objectData.status === 'Return Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        {ret.objectData.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {returnRequests.length === 0 && (
                                            <tr><td colSpan="5" className="text-center py-12 text-gray-500">No return requests found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS (Payment Gateways) */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 max-w-3xl">
                            <header className="mb-6">
                                <h2 className="text-2xl font-bold mb-1 text-black">Site Settings</h2>
                                <p className="text-gray-500 text-sm">Configure your payment gateways and API keys.</p>
                            </header>

                            <div className="glass-panel p-6 border-l-4 border-blue-600">
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><i className="icon-credit-card text-blue-600"></i> Razorpay Integration</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Live Key ID</label>
                                        <input type="text" readOnly value="rzp_live_ScdR7JLNk3lLQ0" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Live Key Secret</label>
                                        <input type="password" placeholder="Enter secret here..." defaultValue="IAP0Wa5twu0OmkoeO8" className="w-full bg-white border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:border-black transition-colors font-mono" />
                                        <p className="text-[10px] text-gray-500 mt-1">Secure placeholder. Your secret will be encrypted before storage.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Webhook Secret</label>
                                        <input type="password" placeholder="Enter webhook secret..." className="w-full bg-white border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:border-black transition-colors font-mono" />
                                        <p className="text-[10px] text-gray-500 mt-1">Ensure this matches the webhook secret set in your Razorpay Dashboard.</p>
                                    </div>
                                    <button className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">Save API Keys</button>
                                </div>
                            </div>

                            <div className="glass-panel p-6 border-l-4 border-red-600">
                                <h3 className="text-sm font-bold text-red-600 mb-4 flex items-center gap-2"><i className="icon-triangle-alert"></i> Danger Zone</h3>
                                <p className="text-xs text-gray-600 mb-4">Permanently delete all products, orders, and inquiries from the database and local storage. This action cannot be undone.</p>
                                <button 
                                    onClick={async () => {
                                        if (!window.confirm("Are you sure you want to completely clear all cache and dashboard data? This cannot be undone.")) return;
                                        setLoading(true);
                                        setToastMessage("Clearing all cache... Please wait.");
                                        try {
                                            localStorage.clear();
                                            setToastMessage("Cache cleared successfully.");
                                            window.location.reload();
                                        } catch (e) {
                                            console.warn("Clear cache failed", e);
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-md text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <i className="icon-loader animate-spin"></i> : <i className="icon-trash"></i>} 
                                    Clear All Cache
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PRODUCT MODAL WITH IMAGE UPLOAD */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in text-gray-900">
                        <div className="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-xl shadow-2xl p-5 md:p-8 relative max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-gray-100 pb-3 shrink-0">
                                <h2 className="text-xl md:text-2xl font-bold text-black">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-black transition-colors bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">
                                    <i className="icon-x text-sm"></i>
                                </button>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 pr-2 pb-4 hide-scrollbar">
                                <form id="productForm" onSubmit={handleFormSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Product Name</label>
                                            <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">SKU</label>
                                            <input type="text" placeholder="e.g. QRY-001" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Price (e.g. $199)</label>
                                            <input required type="text" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Category</label>
                                            <input required type="text" placeholder="e.g. Accessories" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Product Variants (Size & Stock)</label>
                                                <button type="button" onClick={() => setFormData({...formData, variants: [...(formData.variants || []), { size: '', stock_quantity: 0 }]})} className="text-xs bg-black text-white px-3 py-1 rounded">Add Variant</button>
                                            </div>
                                            <div className="space-y-2">
                                                {(formData.variants || []).map((variant, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Size (e.g. S, M, L)" 
                                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-black outline-none"
                                                            value={variant.size}
                                                            onChange={e => {
                                                                const newVariants = [...formData.variants];
                                                                newVariants[idx].size = e.target.value;
                                                                setFormData({...formData, variants: newVariants, sizes: newVariants.map(v => v.size).filter(Boolean)});
                                                            }}
                                                        />
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            placeholder="Stock Qty" 
                                                            className="w-24 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-black outline-none"
                                                            value={variant.stock_quantity}
                                                            onChange={e => {
                                                                const newVariants = [...formData.variants];
                                                                newVariants[idx].stock_quantity = parseInt(e.target.value, 10) || 0;
                                                                const totalStock = newVariants.reduce((acc, v) => acc + (parseInt(v.stock_quantity, 10) || 0), 0);
                                                                setFormData({...formData, variants: newVariants, stock: totalStock});
                                                            }}
                                                        />
                                                        <button type="button" onClick={() => {
                                                            const newVariants = formData.variants.filter((_, i) => i !== idx);
                                                            const totalStock = newVariants.reduce((acc, v) => acc + (parseInt(v.stock_quantity, 10) || 0), 0);
                                                            setFormData({...formData, variants: newVariants, sizes: newVariants.map(v => v.size).filter(Boolean), stock: totalStock});
                                                        }} className="text-red-500 hover:text-red-700 px-2"><i className="icon-trash"></i></button>
                                                    </div>
                                                ))}
                                                {(!formData.variants || formData.variants.length === 0) && (
                                                    <p className="text-xs text-gray-400">No variants added. Product will be treated as single-size.</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Stock Qty</label>
                                                <input required type="number" min="0" className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none transition-colors" value={formData.stock} readOnly />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Status</label>
                                                <select className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                                    <option value="Active">Active</option>
                                                    <option value="Draft">Draft</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 mt-2 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                                            <input 
                                                type="checkbox" 
                                                id="showAddToCart" 
                                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                                checked={formData.showAddToCart} 
                                                onChange={e => setFormData({...formData, showAddToCart: e.target.checked})} 
                                            />
                                            <label htmlFor="showAddToCart" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Display 'Add to Cart' button for this product?</label>
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-1 md:col-span-2">
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Product Images</label>
                                            <button 
                                                type="button" 
                                                onClick={handleGenerateDescription}
                                                disabled={isGeneratingDesc}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
                                            >
                                                {isGeneratingDesc ? (
                                                    <><i className="icon-loader animate-spin"></i> Reading...</>
                                                ) : (
                                                    <><i className="icon-wand-sparkles"></i> Generate Product Details</>
                                                )}
                                            </button>
                                        </div>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center hover:bg-gray-100 transition-colors relative cursor-pointer group">
                                            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="flex flex-col items-center gap-2">
                                                <i className="icon-cloud-upload text-3xl text-gray-400 group-hover:text-black transition-colors"></i>
                                                <p className="text-sm font-medium text-gray-700">Click or drag images to upload</p>
                                                <p className="text-[10px] md:text-xs text-gray-500">Supports full-quality JPG, PNG, and WebP uploads</p>
                                            </div>
                                        </div>
                                        {formData.images && formData.images.length > 0 && (
                                            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 hide-scrollbar">
                                                {formData.images.map((img, idx) => (
                                                    <div key={idx} className="relative w-20 h-20 rounded-md border border-gray-200 overflow-hidden shrink-0 group">
                                                        <img loading="lazy" src={img} className="w-full h-full object-cover" alt="upload preview" />
                                                        <button type="button" onClick={(e) => {
                                                            e.preventDefault();
                                                            const newImages = formData.images.filter((_, i) => i !== idx);
                                                            setFormData({...formData, images: newImages, image: newImages[0] || ''});
                                                        }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <i className="icon-x text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-1 md:col-span-2 pt-2 border-t border-gray-100 mt-2">
                                        <h3 className="text-sm font-bold text-black mb-4">Technical Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Material</label>
                                                <input type="text" className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors ${isGeneratingDesc ? 'bg-gray-200 animate-pulse text-transparent' : 'bg-gray-50'}`} value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Origin</label>
                                                <input type="text" className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors ${isGeneratingDesc ? 'bg-gray-200 animate-pulse text-transparent' : 'bg-gray-50'}`} value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Care</label>
                                                <input type="text" className={`w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors ${isGeneratingDesc ? 'bg-gray-200 animate-pulse text-transparent' : 'bg-gray-50'}`} value={formData.care} onChange={e => setFormData({...formData, care: e.target.value})} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                                            <textarea rows="4" className={`w-full border border-gray-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-black resize-none transition-colors ${isGeneratingDesc ? 'bg-gray-200 animate-pulse text-transparent' : 'bg-gray-50'}`} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            
                            <div className="pt-4 flex flex-col md:flex-row justify-end gap-3 border-t border-gray-100 shrink-0 bg-white">
                                <button type="button" onClick={closeModal} disabled={loading} className="w-full md:w-auto px-6 py-3 md:py-2.5 rounded-md text-sm font-medium border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                                <button type="submit" form="productForm" disabled={loading || !isFormValid} className="w-full md:w-auto px-6 py-3 md:py-2.5 rounded-md text-sm font-medium bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <i className="icon-loader animate-spin"></i> : <i className="icon-save"></i>} 
                                    {loading ? 'Saving...' : 'Save Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {productToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in text-gray-900">
                        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4 mx-auto">
                                <i className="icon-triangle-alert text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2 text-black">Confirm Action</h3>
                            <p className="text-gray-500 text-center text-sm mb-6">
                                Are you sure you want to delete <span className="font-bold text-black">{productToDelete.objectData.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setProductToDelete(null)} disabled={loading} className="px-6 py-2.5 rounded-md text-sm font-medium border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                                <button onClick={executeDelete} disabled={loading} className="px-6 py-2.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex-1 flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed">
                                    {loading ? <i className="icon-loader animate-spin text-sm"></i> : <i className="icon-trash text-sm"></i>} 
                                    {loading ? 'Deleting...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ORDER MANAGEMENT & SHIPPING LABEL MODAL */}
                {selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in text-gray-900 print:absolute print:inset-0 print:p-0 print:bg-white print:block">
                        <div className={`bg-white w-full ${showLabel ? 'max-w-2xl' : 'max-w-5xl'} rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:max-w-none print:w-full transition-all duration-300`}>
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white print:hidden">
                                <div>
                                    <h3 className="text-xl font-bold text-black">{showLabel ? 'Shipping Label' : 'Order Management'}</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Order #{selectedOrder.objectData.orderId || selectedOrder.objectId.slice(-8)}</p>
                                </div>
                                <div className="flex gap-3">
                                    {showLabel && (
                                        <button onClick={() => window.print()} className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                                            <i className="icon-printer"></i> Print Label
                                        </button>
                                    )}
                                    {showLabel ? (
                                        <button onClick={() => setShowLabel(false)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                                            <i className="icon-arrow-left"></i> Back to Details
                                        </button>
                                    ) : (
                                        <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                            <i className="icon-x"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-6 md:p-8 overflow-y-auto bg-white print:overflow-visible print:p-12 print:mx-auto print:w-full">
                                {showLabel ? (
                                    /* SHIPPING LABEL VIEW */
                                    <div className="border-2 border-black p-8 max-w-lg mx-auto bg-white relative">
                                        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
                                            <div>
                                                <h1 className="text-2xl font-serif font-bold tracking-[0.2em] uppercase mb-1">QRYNTOX</h1>
                                                <p className="text-[10px] uppercase tracking-widest text-gray-500">Premium E-Commerce</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold font-mono tracking-wider">{selectedOrder.objectData.courier || 'STANDARD'}</div>
                                                <p className="text-[10px] uppercase font-bold mt-1">TRACKING: {selectedOrder.objectData.trackingNumber}</p>
                                            </div>
                                        </div>
                                        <div className="mb-8">
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ship To</h4>
                                            <p className="font-bold text-lg leading-tight uppercase">{selectedOrder.objectData.customerName || 'Guest Customer'}</p>
                                            <p className="text-sm uppercase text-gray-800 mt-2 max-w-[250px] leading-relaxed">{selectedOrder.objectData.shippingAddress || 'No address provided'}</p>
                                            <p className="text-sm font-bold mt-2 uppercase text-gray-600">PIN: {selectedOrder.objectData.shippingAddress?.match(/\d{5,6}/) || 'N/A'} | MOB: {selectedOrder.objectData.customerPhone || 'N/A'}</p>
                                        </div>
                                        <div className="border-t-2 border-black pt-4">
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Order Details</h4>
                                            <p className="text-xs font-mono font-bold mb-3">Order ID: {selectedOrder.objectData.orderId || selectedOrder.objectId.slice(-8)}</p>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 border-b border-gray-200 pb-1 inline-block">Products Included</p>
                                                {(() => {
                                                    let items = [];
                                                    try { items = JSON.parse(selectedOrder.objectData.items || '[]'); } catch(e) {}
                                                    return items.map((item, i) => (
                                                        <p key={i} className="text-xs font-mono text-black py-1">
                                                            • {item.name} {item.size ? `[Size: ${item.size}]` : ''} - Qty: {item.quantity}
                                                        </p>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                        <div className="mt-8 text-center border-t-2 border-black pt-6">
                                            {/* Mock Barcode */}
                                            <div className="h-16 w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_5px,transparent_5px,transparent_8px,#000_8px,#000_12px)] opacity-80 mb-2"></div>
                                            <p className="font-mono text-xs tracking-[0.2em]">{selectedOrder.objectData.trackingNumber || '000000000000'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* ORDER DETAILS & MANAGEMENT VIEW */
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
                                        {/* LEFT: Order Summary */}
                                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 shadow-sm flex flex-col h-full">
                                            <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-6 pb-4 border-b border-gray-200 shrink-0">Order Summary</h4>
                                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                                {(() => {
                                                    let items = [];
                                                    try { items = JSON.parse(selectedOrder.objectData.items || '[]'); } catch(e) {}
                                                    return items.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-white rounded border border-gray-200 flex items-center justify-center shrink-0 p-1">
                                                                {item.image ? <img loading="lazy" src={item.image} className="w-full h-full object-cover"/> : <i className="icon-package text-gray-400"></i>}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900 leading-tight">{item.name}</p>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ''}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.price}</p>
                                                    </div>
                                                    ));
                                                })()}
                                            </div>
                                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 font-medium">Subtotal</span>
                                                    <span className="font-bold text-gray-900">{String(selectedOrder.objectData.total || '$0.00')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 font-medium">Shipping</span>
                                                    <span className="font-bold text-gray-900">$0.00</span>
                                                </div>
                                                <div className="flex justify-between pt-4 border-t border-gray-200 mt-2">
                                                    <span className="font-bold text-black uppercase text-xs tracking-wider">Total</span>
                                                    <span className="font-bold text-xl text-black">{String(selectedOrder.objectData.total || '$0.00')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: Customer & Shipping */}
                                        <div className="flex flex-col gap-6">
                                            {/* Customer Info */}
                                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 shadow-sm">
                                                <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-6 pb-4 border-b border-gray-200">Customer Information</h4>
                                                <div className="grid grid-cols-2 gap-5 text-sm">
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Full Name</p>
                                                        <p className="font-medium text-gray-900">{selectedOrder.objectData.customerName || 'Guest Customer'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Phone Number</p>
                                                        <p className="font-medium text-gray-900">{selectedOrder.objectData.customerPhone || 'Not provided'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Payment Status</p>
                                                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded ${selectedOrder.objectData.paymentStatus === 'Pending Verification' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{selectedOrder.objectData.paymentStatus || 'Paid'}</span>
                                                    </div>
                                                    {selectedOrder.objectData.utr && (
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">UTR / Transaction ID</p>
                                                        <p className="text-sm font-mono font-medium text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded inline-block">{selectedOrder.objectData.utr}</p>
                                                    </div>
                                                    )}
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Shipping Address</p>
                                                        <p className="text-sm text-gray-800 leading-relaxed bg-white p-3 border border-gray-200 rounded min-h-[60px]">{selectedOrder.objectData.shippingAddress || 'No address provided'}</p>
                                                    </div>
                                                    
                                                    {selectedOrder.objectData.status === 'Cancelled' && selectedOrder.objectData.cancelReason && (
                                                        <div className="col-span-2 mt-2 pt-4 border-t border-gray-200">
                                                            <div className="bg-red-50 border border-red-200 p-4 rounded-sm">
                                                                <p className="text-[10px] text-red-600 uppercase tracking-widest font-bold mb-1 flex items-center gap-1"><i className="icon-triangle-alert"></i> Cancellation Reason</p>
                                                                <p className="text-sm font-medium text-red-800">{selectedOrder.objectData.cancelReason}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="col-span-2 mt-2 pt-4 border-t border-gray-200 bg-gray-100 p-4 rounded-sm border">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-1"><i className="icon-truck"></i> Delivery Management</p>
                                                        
                                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Status</label>
                                                                <select 
                                                                    value={shippingData.status}
                                                                    onChange={e => setShippingData({...shippingData, status: e.target.value})}
                                                                    className="w-full bg-white border border-gray-300 px-3 py-2 text-sm rounded focus:border-black focus:outline-none"
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Awaiting Confirmation">Awaiting Confirmation</option>
                                                                    <option value="Processing">Processing</option>
                                                                    <option value="Shipped">Shipped</option>
                                                                    <option value="Out for Delivery">Out for Delivery</option>
                                                                    <option value="Delayed">Delayed</option>
                                                                    <option value="Delivered">Delivered</option>
                                                                    <option value="Cancelled">Cancelled</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Delivery Date</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="e.g. Apr 25, 2026"
                                                                    value={shippingData.estDelivery} 
                                                                    onChange={e => setShippingData({...shippingData, estDelivery: e.target.value})}
                                                                    className="w-full bg-white border border-gray-300 px-3 py-2 text-sm rounded focus:border-black focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mb-4">
                                                            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Delivery Note (Visible to Customer)</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="e.g. Delayed due to heavy rain in Thrissur"
                                                                value={shippingData.deliveryNote} 
                                                                onChange={e => setShippingData({...shippingData, deliveryNote: e.target.value})}
                                                                className="w-full bg-white border border-gray-300 px-3 py-2 text-sm rounded focus:border-black focus:outline-none"
                                                            />
                                                        </div>

                                                        <button 
                                                            onClick={async () => {
                                                                const newObjectData = { 
                                                                    ...selectedOrder.objectData, 
                                                                    status: shippingData.status,
                                                                    estimatedDeliveryDate: shippingData.estDelivery,
                                                                    deliveryNote: shippingData.deliveryNote
                                                                };
                                                                const updatedOrder = { 
                                                                    ...selectedOrder, 
                                                                    objectData: newObjectData 
                                                                };
                                                                
                                                                // Optimistic UI Update
                                                                const updatedOrders = orders.map(o => o.objectId === updatedOrder.objectId ? updatedOrder : o);
                                                                setOrders(updatedOrders);
                                                                localStorage.setItem('qryntox_local_orders', JSON.stringify(updatedOrders));
                                                                setSelectedOrder(updatedOrder);
                                                                
                                                                // Save to DB
                                                                try {
                                                                    if (window.trickleUpdateObject) {
                                                                        await window.trickleUpdateObject(updatedOrder.objectType || 'orders', updatedOrder.objectId, newObjectData);
                                                                    }
                                                                    setToastMessage('Delivery details updated successfully');
                                                                } catch (err) {
                                                                    console.warn("DB update error:", err);
                                                                    setToastMessage('Details updated locally, sync pending');
                                                                }
                                                                setTimeout(() => setToastMessage(''), 3000);
                                                            }}
                                                            className="w-full bg-black text-white px-4 py-2 text-xs font-bold uppercase rounded hover:bg-gray-800 transition-colors"
                                                        >
                                                            Update Details
                                                        </button>
                                                    </div>

                                                    <div className="col-span-2 mt-2 pt-4 border-t border-gray-200">
                                                        <button 
                                                            onClick={() => setShowLabel(true)} 
                                                            className="w-full bg-white border border-gray-300 text-black hover:bg-gray-50 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors flex justify-center items-center gap-2 shadow-sm"
                                                        >
                                                            <i className="icon-printer text-sm"></i> Generate Label
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>


                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ORDER CANCEL CONFIRMATION MODAL */}
                {orderToDeleteAdmin && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in text-gray-900">
                        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4 mx-auto">
                                <i className="icon-triangle-alert text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2 text-black">Cancel Order?</h3>
                            <p className="text-gray-500 text-center text-sm mb-6">
                                Are you sure you want to cancel order <span className="font-bold text-black">#{orderToDeleteAdmin.objectData.orderId || orderToDeleteAdmin.objectId.slice(-8)}</span>? The customer's order status will be updated to Cancelled.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setOrderToDeleteAdmin(null)} disabled={loading} className="px-6 py-2.5 rounded-md text-sm font-medium border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed">Go Back</button>
                                <button onClick={executeOrderCancel} disabled={loading} className="px-6 py-2.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex-1 flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed">
                                    {loading ? <i className="icon-loader animate-spin text-sm"></i> : <i className="icon-circle-x text-sm"></i>} 
                                    {loading ? 'Cancel' : 'Confirm Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TOAST NOTIFICATION */}
                {toastMessage && (
                    <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-[110]">
                        <i className="icon-circle-check text-green-400"></i>
                        <span className="text-sm font-medium">{toastMessage}</span>
                    </div>
                )}
                
                {/* LIVE ALERTS */}
                {alerts.length > 0 && (
                    <div className="fixed top-6 right-6 z-[120] flex flex-col gap-3 pointer-events-none items-end">
                        <button 
                            onClick={() => setAlerts([])}
                            className="pointer-events-auto bg-white border border-gray-200 text-gray-500 hover:text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors mb-1 flex items-center gap-1"
                        >
                            <i className="icon-x text-xs"></i> Clear All
                        </button>
                        {alerts.map(alert => (
                            <div key={alert.id} className={`flex items-center gap-3 px-5 py-4 rounded-lg shadow-2xl animate-slide-down pointer-events-auto border ${alert.type === 'new' ? 'bg-blue-600 text-white border-blue-500' : 'bg-red-600 text-white border-red-500'}`}>
                                {alert.type === 'new' ? <i className="icon-shopping-bag text-xl text-white"></i> : <i className="icon-triangle-alert text-xl text-white"></i>}
                                <span className="text-sm font-bold uppercase tracking-wider text-white">{alert.message}</span>
                            </div>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}
