function TrackOrderPage() {
    const [trackingId, setTrackingId] = React.useState('');
    const [searchInput, setSearchInput] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [trackingData, setTrackingData] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const awb = params.get('awb') || params.get('orderID');
        
        if (awb) {
            setTrackingId(awb);
            setSearchInput(awb);
            fetchTrackingDetails(awb);
        } else {
            setLoading(false);
            setError("Please enter a tracking number");
        }
    }, []);

    const fetchTrackingDetails = async (id) => {
        setLoading(true);
        setError(null);
        setTrackingData(null);

        try {
            if (window.db) {
                const docRef = window.db.collection('orders').doc(id);
                const docSnap = await docRef.get();
                
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (!data.shiprocket_awb) {
                        setError("Shipment is being prepared. Check back soon!");
                    } else {
                        setTrackingData({
                            awb_code: data.shiprocket_awb,
                            courier_name: data.courier_name || 'Standard Courier',
                            etd: data.etd || '',
                            current_status: data.status || 'IN_TRANSIT',
                            order_id: id,
                            scans: data.scans || [
                                { date: new Date().toLocaleString(), location: 'System', activity: 'Order placed and verified' }
                            ]
                        });
                    }
                } else if (id.startsWith('AWB') || id === '12345') {
                    // Fallback mock if direct AWB entered
                    setTrackingData({
                        awb_code: id,
                        courier_name: 'Delhivery Surface',
                        etd: '2026-05-02',
                        current_status: 'IN_TRANSIT',
                        order_id: 'ORD982374',
                        scans: [
                            { date: '2026-04-24 10:00 AM', location: 'System', activity: 'Order placed successfully' }
                        ]
                    });
                } else {
                    setError("Not Found. Please check your Order ID or AWB number.");
                }
            } else {
                // Mock behavior if firebase is not fully connected
                if (id.startsWith('AWB') || id === '12345') {
                    setTrackingData({
                        awb_code: id,
                        courier_name: 'Delhivery Surface',
                        etd: '2026-05-02',
                        current_status: 'IN_TRANSIT',
                        order_id: 'ORD982374',
                        scans: [
                            { date: '2026-04-24 10:00 AM', location: 'System', activity: 'Order placed successfully' }
                        ]
                    });
                } else {
                    setError("Shipment is being prepared. Check back soon!");
                }
            }
        } catch (err) {
            console.error(err);
            setError("Error fetching tracking details. Please try again.");
        }
        
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('awb', searchInput.trim());
        window.history.pushState({}, '', url);
        
        setTrackingId(searchInput.trim());
        fetchTrackingDetails(searchInput.trim());
    };

    const copyToClipboard = () => {
        if (trackingData?.awb_code) {
            navigator.clipboard.writeText(trackingData.awb_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const timelineSteps = [
        { id: 'PLACED', label: 'Order Placed', icon: 'icon-clipboard-check' },
        { id: 'SHIPPED', label: 'Shipped', icon: 'icon-package' },
        { id: 'IN_TRANSIT', label: 'In Transit', icon: 'icon-truck' },
        { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'icon-map-pin' },
        { id: 'DELIVERED', label: 'Delivered', icon: 'icon-check' }
    ];

    const getStepStatus = (stepId, currentStatus) => {
        const currentIndex = timelineSteps.findIndex(s => s.id === currentStatus);
        const stepIndex = timelineSteps.findIndex(s => s.id === stepId);
        
        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'pending';
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full" data-name="track-order-page" data-file="components/TrackOrderPage.js">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-black uppercase tracking-widest mb-2">Track Shipment</h1>
                <p className="text-sm text-gray-500 font-medium">Follow your premium delivery from our vault to your door.</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-10 relative">
                <input 
                    type="text" 
                    placeholder="Enter AWB or Order ID..." 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-sm py-4 pl-4 pr-16 text-sm font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button type="submit" className="absolute right-2 top-2 bottom-2 bg-black text-white px-4 flex items-center justify-center rounded-sm hover:bg-gray-800 transition-colors">
                    <i className="icon-search text-lg"></i>
                </button>
            </form>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-md rounded-sm border border-gray-200">
                    <i className="icon-loader animate-spin text-4xl text-gray-400 mb-4"></i>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fetching your shipment details...</p>
                </div>
            ) : error ? (
                <div className="bg-white p-12 text-center rounded-sm border border-gray-200 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="icon-circle-help text-3xl text-gray-400"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
                    <p className="text-sm text-gray-500 mb-6">Please verify the tracking number you entered is correct.</p>
                </div>
            ) : trackingData ? (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-white rounded-sm border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tracking Number</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-mono font-bold text-black">{trackingData.awb_code}</p>
                                    <button onClick={copyToClipboard} className="text-gray-400 hover:text-black transition-colors" title="Copy">
                                        {copied ? <i className="icon-check text-green-500"></i> : <i className="icon-copy"></i>}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Courier Partner</p>
                                <p className="text-sm font-bold text-black">{trackingData.courier_name}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estimated Delivery</p>
                                <p className="text-sm font-bold text-black">
                                    {trackingData.etd ? new Date(trackingData.etd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Container */}
                    <div className="bg-white rounded-sm border border-gray-200 p-6 sm:p-10 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-8 border-b border-gray-100 pb-4">Shipment Journey</h3>
                        
                        <div className="relative">
                            {timelineSteps.map((step, index) => {
                                const status = getStepStatus(step.id, trackingData.current_status);
                                const isLast = index === timelineSteps.length - 1;
                                
                                let circleColor = "bg-white border-gray-200 text-gray-300";
                                let iconColor = "text-gray-300";
                                let lineColor = "bg-gray-100";
                                let textColor = "text-gray-400";
                                
                                if (status === 'completed') {
                                    circleColor = "bg-black border-black";
                                    iconColor = "text-white";
                                    lineColor = "bg-black";
                                    textColor = "text-black";
                                } else if (status === 'current') {
                                    circleColor = "bg-white border-black border-2";
                                    iconColor = "text-black";
                                    textColor = "text-black";
                                }

                                // Find matching scan if any to show date
                                let matchedScan = null;
                                if (status === 'completed' || status === 'current') {
                                    // Simplistic mapping for the mock display
                                    if (step.id === 'PLACED') matchedScan = trackingData.scans[0];
                                    if (step.id === 'SHIPPED') matchedScan = trackingData.scans[1];
                                    if (step.id === 'IN_TRANSIT' && status === 'current') matchedScan = trackingData.scans[trackingData.scans.length - 1];
                                }

                                return (
                                    <div key={step.id} className="flex relative">
                                        {/* Line */}
                                        {!isLast && (
                                            <div className={`absolute top-10 left-5 w-[2px] h-full -ml-[1px] ${lineColor} transition-colors duration-500`}></div>
                                        )}
                                        
                                        {/* Circle/Icon */}
                                        <div className="flex-shrink-0 z-10 mr-6">
                                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${circleColor} transition-all duration-500`}>
                                                <i className={`${step.icon} text-lg ${iconColor}`}></i>
                                            </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="pb-12 pt-2 flex-grow">
                                            <h4 className={`text-base font-bold uppercase tracking-wide ${textColor}`}>{step.label}</h4>
                                            
                                            {matchedScan && (
                                                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-sm border border-gray-100">
                                                    <p className="font-medium">{matchedScan.activity}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-[11px] text-gray-400 uppercase tracking-wider font-mono">
                                                        <span>{matchedScan.date}</span>
                                                        {matchedScan.location && <span>• {matchedScan.location}</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}