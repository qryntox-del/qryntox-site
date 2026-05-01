function FirebaseCustomerOrders() {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    
    // Use actual authenticated user
    const currentUser = window.AuthManager ? window.AuthManager.getUser() : { email: 'guest@qryntox.com', name: 'Guest' };

    React.useEffect(() => {
        if (!window.db) {
            setLoading(false);
            return;
        }

        const emailToQuery = (window.auth && window.auth.currentUser) ? window.auth.currentUser.email : currentUser.email;

        if (!emailToQuery) {
            setLoading(false);
            return;
        }

        const unsubscribe = window.db.collection("orders")
            .where("customer_email", "==", emailToQuery)
            .onSnapshot((snapshot) => {
                const fetchedOrders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Sort by timestamp desc
                fetchedOrders.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
                
                setOrders(fetchedOrders);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching Firestore orders:", error);
                setLoading(false);
            });

        return () => unsubscribe();

    }, []);

    const getStatusClass = (status) => {
        switch(status?.toLowerCase()) {
            case 'processing': return 'status-processing';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <i className="icon-loader animate-spin text-4xl text-gray-400 mb-4"></i>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Your Orders...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" data-name="firebase-customer-orders" data-file="components/FirebaseCustomerOrders.js">
            <div className="max-w-4xl mx-auto px-4">
                
                <div className="mb-10">
                    <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">Order History</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Manage and track your recent purchases.</p>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="icon-package text-3xl text-gray-400"></i>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">You haven't placed any orders yet!</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">Discover our premium collection of minimalist products and place your first order today.</p>
                        <a 
                            href="index.html" 
                            className="inline-flex items-center justify-center px-8 py-4 bg-black text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
                        >
                            Start Shopping
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                                            <p className="text-sm font-mono font-semibold text-gray-900">#{order.id.substring(0, 8)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order Date</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {new Date(order.timestamp).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                                            {order.status === 'Processing' && <i className="icon-loader animate-spin mr-1.5 text-[10px]"></i>}
                                            {order.status === 'Shipped' && <i className="icon-truck mr-1.5 text-[10px]"></i>}
                                            {order.status === 'Delivered' && <i className="icon-check mr-1.5 text-[10px]"></i>}
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{order.product_name || 'Premium Item'}</h3>
                                        <p className="text-xl font-semibold text-gray-900">₹{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {order.status === 'Shipped' && order.shiprocket_awb && (
                                            <a 
                                                href={`track.html?awb=${order.shiprocket_awb}`}
                                                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                            >
                                                <i className="icon-map-pin mr-2 text-sm"></i> Track My Package
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}