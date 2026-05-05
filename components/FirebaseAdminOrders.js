function FirebaseAdminOrders() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [shippingStatuses, setShippingStatuses] = React.useState({});
    const [error, setError] = React.useState(null);
    const [toast, setToast] = React.useState(null);

    React.useEffect(() => {
        const fetchOrders = async () => {
            try {
                // In a real implementation with Firebase SDK included:
                // const snapshot = await firebase.firestore().collection('orders').get();
                // const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Simulating Firestore fetch for UI preview
                setTimeout(() => {
                    setOrders([
                        { 
                            id: 'ORD-FIRE-001', 
                            customerName: 'Alice Johnson', 
                            totalAmount: 249.99, 
                            status: 'Pending',
                            items: 'Monolith Wireless Earbuds (x1)'
                        },
                        { 
                            id: 'ORD-FIRE-002', 
                            customerName: 'Marcus Smith', 
                            totalAmount: 89.50, 
                            status: 'Shipped',
                            items: 'Carbon Fiber Wallet (x1)',
                            shiprocketOrderId: 'SR-884921',
                            trackingUrl: 'https://shiprocket.co/tracking/ORD-FIRE-002'
                        },
                        { 
                            id: 'hK359xyJsjRxUcjfWMou', 
                            customerName: 'Elena Rodriguez', 
                            totalAmount: 450.00, 
                            status: 'Pending',
                            items: 'Stealth Aviator Glasses (x2)'
                        }
                    ]);
                    setLoading(false);
                }, 1000);
            } catch (err) {
                console.error("Error fetching orders:", err);
                setError("Failed to load orders from Firestore.");
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const handleCreateShipment = async (order) => {
        setShippingStatuses(prev => ({ ...prev, [order.id]: 'syncing' }));
        
        try {
            const response = await fetch("https://connect.pabbly.com/webhook-listener/webhook/IjU3NjIwNTY0MDYzNjA0M2Q1MjY1NTUzNSI_3D_pc/IjU3NjcwNTZlMDYzNDA0MzE1MjY0NTUzNzUxMzUi_pc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) {
                throw new Error("Pabbly error");
            }
            
            // Update local state: Change status to Processing
            setOrders(prevOrders => prevOrders.map(o => 
                o.id === order.id 
                    ? { ...o, status: 'Processing' } 
                    : o
            ));
            
            setShippingStatuses(prev => ({ ...prev, [order.id]: 'success' }));
            showToast('success', 'Sent to Pabbly!');

        } catch (err) {
            console.error("Webhook Error:", err);
            setShippingStatuses(prev => ({ ...prev, [order.id]: 'error' }));
            showToast('error', 'Pabbly error');
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto relative" data-name="firebase-admin-orders" data-file="components/FirebaseAdminOrders.js">
            
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-slide-up border ${
                    toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                        <i className={`text-lg ${toast.type === 'error' ? 'icon-circle-x' : 'icon-check'}`}></i>
                    </div>
                    <p className="text-sm font-medium">{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                        <i className="icon-x text-sm"></i>
                    </button>
                </div>
            )}

            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm border border-orange-200">
                        <i className="icon-flame text-xl"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Firestore Orders & Shiprocket</h1>
                </div>
                <p className="text-gray-500 text-sm">Manage your Firebase orders and sync shipments automatically.</p>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-600">
                    <i className="icon-circle-alert"></i><p>{error}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Order ID</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Total Amount</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Shipping Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">
                                        <i className="icon-loader animate-spin inline-block mr-2 text-lg"></i> Fetching from Firestore...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No orders found in Firestore.</td>
                                </tr>
                            ) : orders.map((order) => {
                                const isSyncing = shippingStatuses[order.id] === 'syncing';
                                const isError = shippingStatuses[order.id] === 'error';
                                const isSuccess = shippingStatuses[order.id] === 'success';

                                return (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{order.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <div className="font-medium text-gray-900">{order.customerName}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5" title={order.items}>{order.items}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                order.status === 'Shipped' 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                : order.status === 'Processing'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }`}>
                                                {order.status === 'Processing' && <i className="icon-loader animate-spin mr-1.5 text-[10px]"></i>}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {order.shiprocketOrderId ? (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200 flex items-center gap-1.5">
                                                        <i className="icon-hash text-[10px] text-gray-400"></i>
                                                        SR ID: {order.shiprocketOrderId}
                                                    </div>
                                                    {order.trackingUrl && (
                                                        <a 
                                                            href={order.trackingUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 hover:text-black transition-colors"
                                                        >
                                                            <i className="icon-truck text-xs"></i> Track
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1">
                                                    <button 
                                                        onClick={() => handleCreateShipment(order)}
                                                        disabled={isSyncing}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px]"
                                                    >
                                                        {isSyncing ? (
                                                            <><i className="icon-loader animate-spin text-sm"></i> Syncing...</>
                                                        ) : (
                                                            <><i className="icon-cloud-upload text-sm"></i> Create Shipment</>
                                                        )}
                                                    </button>
                                                    {isError && <span className="text-[10px] text-red-500 font-medium mt-1">Check toast for error details</span>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}