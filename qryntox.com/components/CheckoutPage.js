function CheckoutPage() {
    const [items, setItems] = React.useState([]);
    const [formData, setFormData] = React.useState({ 
        mobile: '', pincode: '', city: '', district: '', state: '', houseNo: '', roadName: '', landmark: '', name: '',
        card: '', expiry: '', cvc: ''
    });
    const [status, setStatus] = React.useState('idle'); 
    const [step, setStep] = React.useState('address'); // summary, address, payment, success
    const [paymentMethod, setPaymentMethod] = React.useState('prepaid');
    const [orderId, setOrderId] = React.useState('');
    const [apiError, setApiError] = React.useState('');
    const [isBuyNow, setIsBuyNow] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [successDeliveryDate, setSuccessDeliveryDate] = React.useState('');
    const [showTermsModal, setShowTermsModal] = React.useState(false);
    const [flashClosing, setFlashClosing] = React.useState(false);
    const [showPrePaymentTerms, setShowPrePaymentTerms] = React.useState(false);
    const [shiprocketToken, setShiprocketToken] = React.useState(null);
    const webhookFired = React.useRef(false);
    const ENV = 'PRODUCTION';

    React.useEffect(() => {
        if (window.ShippingService) {
            window.ShippingService.login('shamjusham29@gmail.com', 'Fa87VQ4$RkGrYkqi9#4^QigVboIanjxR')
                .then(token => setShiprocketToken(token))
                .catch(e => console.error("Failed to pre-fetch Shiprocket token", e));
        }
    }, []);

    const updateStockInDB = async (cartItems) => {
        if (!window.trickleGetObject || !window.trickleUpdateObject) return;
        for (const item of cartItems) {
            try {
                const dbProd = await window.trickleGetObject('products', item.id);
                if (dbProd && dbProd.objectData) {
                    let newObjectData = { ...dbProd.objectData };
                    
                    if (newObjectData.variants && newObjectData.variants.length > 0) {
                        newObjectData.variants = newObjectData.variants.map(v => {
                            if (v.size === item.size) {
                                return { ...v, stock_quantity: Math.max(0, parseInt(v.stock_quantity, 10) - item.quantity) };
                            }
                            return v;
                        });
                        newObjectData.stock = newObjectData.variants.reduce((acc, v) => acc + parseInt(v.stock_quantity, 10), 0);
                    } else {
                        const curStock = parseInt(newObjectData.stock, 10) || 0;
                        newObjectData.stock = Math.max(0, curStock - item.quantity);
                    }
                    
                    newObjectData.inStock = newObjectData.stock > 0;
                    
                    await window.trickleUpdateObject('products', item.id, newObjectData);
                }
            } catch(e) {}
        }
        window.dispatchEvent(new Event('productsUpdated'));
    };

    const calculateEstDelivery = (pincode) => {
        if (!pincode) return 'Pending';
        const days = (String(pincode).startsWith('67') || String(pincode).startsWith('68')) ? 3 : 7;
        const date = new Date();
        date.setDate(date.getDate() + days);
        return window.formatDateIST ? window.formatDateIST(date) : date.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    React.useEffect(() => {
        try {
            if (window.AuthManager) {
                const user = window.AuthManager.getUser();
                if (user) {
                    setFormData(prev => ({
                        ...prev,
                        name: user.name || '',
                        mobile: user.phone || '',
                        houseNo: user.address?.houseNo || '',
                        roadName: user.address?.roadName || '',
                        city: user.address?.city || '',
                        pincode: user.address?.pincode || '',
                        state: user.address?.state || '',
                        district: user.address?.district || ''
                    }));
                }
            }
        } catch (e) {}
        
        const urlParams = new URLSearchParams(window.location.search);
        const buyNowId = urlParams.get('buyNow');
        
        if (buyNowId) {
            setIsBuyNow(true);
            const qty = parseInt(urlParams.get('qty') || '1', 10);
            const size = urlParams.get('size');
            try {
                const localProducts = JSON.parse(localStorage.getItem('qryntox_local_products') || '[]');
                const product = localProducts.find(p => p.objectId === buyNowId);
                
                if (product) {
                    setItems([{
                        id: product.objectId,
                        size: size || null,
                        ...product.objectData,
                        quantity: qty
                    }]);
                    return;
                } else if (window.trickleGetObject) {
                    window.trickleGetObject('products', buyNowId).then(dbProd => {
                        if (dbProd && dbProd.objectData) {
                            setItems([{
                                id: dbProd.objectId,
                                size: size || null,
                                ...dbProd.objectData,
                                quantity: qty
                            }]);
                        }
                    });
                    return;
                }
            } catch (e) {
                console.error('Failed to load single product for checkout', e);
            }
        }
        
        setItems(window.CartManager.getItems());
    }, []);

    const total = items.reduce((sum, item) => sum + (parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0) * item.quantity, 0);

    React.useEffect(() => {
        if (step === 'success') {
            const webhookKey = `webhook_fired_${orderId}`;
            if (!window.hasSentWebhook && !webhookFired.current && !sessionStorage.getItem(webhookKey)) {
                window.hasSentWebhook = true;
                webhookFired.current = true;
                sessionStorage.setItem(webhookKey, 'true');

                // Securely fire Pabbly Webhook with actual order details
                try {
                    const img = new Image();
                    const wbUrl = `https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjcwNTZlMDYzNTA0MzU1MjZkNTUzZDUxMzAi_pc?order_id=${encodeURIComponent(orderId || 'NoID')}&name=${encodeURIComponent(formData.name || 'Customer')}&phone=${encodeURIComponent(formData.mobile || 'NoPhone')}`;
                    img.src = wbUrl;
                } catch (e) {
                    console.error('Webhook error', e);
                }

                if (window.confetti) {
                    window.confetti({
                        particleCount: 200,
                        spread: 90,
                        origin: { y: 0.6 },
                        colors: ['#000000', '#ffffff', '#e0e0e0', '#3b82f6', '#10b981', '#f59e0b']
                    });
                }

                if (typeof window.gtag === 'function' && items.length > 0) {
                    window.gtag('event', 'purchase', {
                        transaction_id: orderId || 'ORD-' + Date.now(),
                        value: total,
                        currency: 'INR',
                        items: items.map(i => ({
                            item_name: i.name
                        }))
                    });
                } else if (window.trackGAEvent && items.length > 0) {
                    window.trackGAEvent('purchase', {
                        transaction_id: orderId || 'ORD-' + Date.now(),
                        value: total,
                        currency: 'INR',
                        items: items.map(i => ({
                            item_name: i.name
                        }))
                    });
                }
            }
        }
    }, [step, items, total, orderId, formData.name]);

    const handleContinue = async (e) => {
        e.preventDefault();
        
        // Stock Validation Check
        setStatus('processing');
        let stockError = false;
        try {
            for (let item of items) {
                const prod = await window.trickleGetObject('products', item.id);
                if (prod && prod.objectData) {
                    const variants = prod.objectData.variants || [];
                    const variant = variants.find(v => v.size === item.size);
                    const currentStock = variant ? parseInt(variant.stock_quantity, 10) : parseInt(prod.objectData.stock, 10);
                    if (item.quantity > currentStock) {
                        stockError = true;
                        setApiError(`Sorry, ${item.name} (Size: ${item.size || 'Default'}) is sold out or has insufficient stock. Please update your cart.`);
                        break;
                    }
                }
            }
        } catch(err) {
            console.error("Failed to check stock", err);
        }
        
        if (stockError) {
            setStatus('idle');
            return;
        }
        setStatus('idle');
        
        let newErrors = {};
        if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = 'Please enter a valid 10-digit mobile number';
        if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Please enter a valid 6-digit pincode';
        
        const isGibberish = (str) => !str || str.trim().length < 3 || /^(.)\1+$/.test(str) || /asdf|qwer|zxcv|1234/i.test(str);
        if (isGibberish(formData.houseNo)) newErrors.houseNo = 'Please enter a valid House No./Building Name';
        if (isGibberish(formData.roadName)) newErrors.roadName = 'Please enter a valid Road Name/Area';
        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.city?.trim()) newErrors.city = 'City is required';
        if (!formData.district?.trim()) newErrors.district = 'District is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';

        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            return;
        }
        
        // Save valid customer details strictly to isolated user profile
        try {
            if (window.AuthManager) {
                const currentUser = window.AuthManager.getUser();
                if (currentUser) {
                    window.AuthManager.updateProfile({
                        name: formData.name || currentUser.name,
                        phone: formData.mobile || currentUser.phone,
                        address: {
                            houseNo: formData.houseNo,
                            roadName: formData.roadName,
                            city: formData.city,
                            pincode: formData.pincode,
                            state: formData.state,
                            district: formData.district
                        }
                    });
                }
            }
        } catch (e) {}
        
        setOrderId('ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase());
        setStep('payment');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePincodeChange = async (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        setFormData(prev => ({...prev, pincode: val}));
        setErrors(prev => ({...prev, pincode: ''}));
        
        if (val.length === 6) {
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                const data = await res.json();
                if (data && data[0].Status === 'Success') {
                    const postOffice = data[0].PostOffice[0];
                    setFormData(prev => ({
                        ...prev,
                        pincode: val,
                        city: postOffice.Block || postOffice.Region || postOffice.District,
                        district: postOffice.District,
                        state: postOffice.State
                    }));
                } else {
                    setErrors(prev => ({...prev, pincode: 'Invalid Pincode'}));
                }
            } catch(err) {
                console.error('Pincode lookup failed', err);
            }
        }
    };

    const handlePayment = () => {
        setStatus('processing');
        setApiError('');
        const amountInPaise = Math.round(total * 100);

        const options = {
            key: 'rzp_live_ShmsGeNkKyUWbY',
            amount: amountInPaise,
            currency: 'INR',
            name: 'QRYNTOX',
            description: 'Premium Order Payment',
            handler: async function (response) {
                try {
                    const fullAddress = `${formData.houseNo}, ${formData.roadName}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.district}, ${formData.state} - ${formData.pincode}`;
                    const estDelivery = calculateEstDelivery(formData.pincode);
                    setSuccessDeliveryDate(estDelivery);

                    const currentUser = window.AuthManager ? window.AuthManager.getUser() : null;
                    const userEmail = currentUser ? currentUser.email : 'guest@qryntox.com';

                    let orderData = {
                        orderId: orderId,
                        customerName: formData.name,
                        customerPhone: formData.mobile,
                        shippingAddress: fullAddress,
                        total: `₹${total.toFixed(2)}`,
                        status: 'Awaiting Confirmation',
                        paymentStatus: 'Paid - Live',
                        paymentId: response.razorpay_payment_id,
                        utr: response.razorpay_signature || 'Verified',
                        items: JSON.stringify(items),
                        customerEmail: userEmail,
                        estimatedDeliveryDate: estDelivery,
                        estDelivery: estDelivery,
                        date: new Date().toISOString()
                    };

                    // Auto Push to Shiprocket with Pre-fetched Token and Validation
                    try {
                        if (shiprocketToken && formData.pincode) {
                            const payload = {
                                order_id: orderId + '-' + Date.now().toString().slice(-4),
                                order_date: new Date().toISOString().split('T')[0],
                                pickup_location: "Primary",
                                billing_customer_name: formData.name || "Guest",
                                billing_address: formData.houseNo + ' ' + formData.roadName,
                                billing_address_2: formData.landmark || "",
                                billing_city: formData.city || "City",
                                billing_pincode: Number(formData.pincode),
                                billing_state: formData.state || "State",
                                billing_country: "India",
                                billing_email: "guest@qryntox.com",
                                billing_phone: formData.mobile || "9999999999", 
                                shipping_is_billing: true,
                                order_items: items.map(i => ({
                                    name: i.name,
                                    sku: i.sku || 'SKU-' + Date.now().toString().slice(-4),
                                    units: i.quantity,
                                    selling_price: parseFloat(String(i.price).replace(/[^0-9.]/g, '')),
                                    discount: 0, tax: 0, hsn: 441122
                                })),
                                payment_method: "Prepaid",
                                sub_total: total,
                                length: 10, breadth: 10, height: 10, weight: 0.5
                            };
                            const srRes = await window.ShippingService.createCustomOrder(shiprocketToken, payload);
                            if (srRes && srRes.shipment_id) {
                                orderData.shiprocketShipmentId = srRes.shipment_id;
                                orderData.status = 'Processing'; // Status update on sync success
                                try {
                                    const awb = await window.ShippingService.generateAWB(shiprocketToken, srRes.shipment_id);
                                    orderData.trackingNumber = awb?.response?.data?.awb_code || srRes.awb_code;
                                    orderData.courier = awb?.response?.data?.courier_name || 'Shiprocket';
                                } catch(e) {}
                            } else if (srRes) {
                                orderData.shiprocketError = srRes.message || 'Invalid Order Data';
                                console.error('Shiprocket Rejected Order:', srRes);
                            }
                        } else {
                            orderData.shiprocketError = !formData.pincode ? 'Missing Pincode' : 'Token Not Ready (Invalid/Expired)';
                            console.error('Shiprocket Error:', orderData.shiprocketError);
                        }
                    } catch (srErr) {
                        console.error('Shiprocket Auto-Sync failed. Exception:', srErr);
                        orderData.shiprocketError = srErr.message || 'Sync Exception';
                    }

                    if (window.trickleCreateObject) {
                        try {
                            await window.trickleCreateObject(`orders:${formData.mobile}`, orderData);
                        } catch (e) {
                            console.error('Failed to save to DB', e);
                        }
                    }
                    
                    await updateStockInDB(items);

                    const localKey = `qryntox_orders_${formData.mobile}`;
                    const localOrders = JSON.parse(localStorage.getItem(localKey) || '[]');
                    localOrders.unshift({ objectId: response.razorpay_payment_id, objectData: orderData, createdAt: new Date().toISOString() });
                    localStorage.setItem(localKey, JSON.stringify(localOrders));

                    const coinSound = document.getElementById('coinSound');
                    if (coinSound) {
                        coinSound.volume = 0.6;
                        coinSound.play().catch(e => console.log('Audio wait:', e));
                    }

                    if (!isBuyNow) {
                        window.CartManager.clearCart();
                    }
                    setStatus('success');
                    setStep('success');
                    
                    setTimeout(() => {
                        window.location.href = 'profile.html';
                    }, 3000);
                } catch (err) {
                    setApiError('Payment successful but failed to save order.');
                    setStatus('error');
                }
            },
            prefill: {
                name: formData.name,
                contact: formData.mobile
            },
            theme: {
                color: '#000000'
            },
            modal: {
                ondismiss: function() {
                    setStatus('idle');
                }
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                setApiError(`Payment Failed: ${response.error.description}`);
                setStatus('error');
            });
            rzp.open();
        } catch (error) {
            setApiError('Unable to initialize payment.');
            setStatus('error');
        }
    };

    const executeCheckout = async () => {
        if (items.length === 0) return;

        const coinSound = document.getElementById('coinSound');
        if (coinSound) {
            coinSound.volume = 0.6;
            // Unlock audio on direct user interaction
            const playPromise = coinSound.play();
            if (playPromise !== undefined && paymentMethod === 'prepaid') {
                playPromise.then(() => {
                    coinSound.pause();
                    coinSound.currentTime = 0;
                }).catch(e => console.log('Audio wait:', e));
            }
        }

        if (paymentMethod === 'prepaid') {
            handlePayment();
            return;
        }

        if (paymentMethod === 'cod') {
            setStatus('processing');
            setApiError('');
            try {
                const fullAddress = `${formData.houseNo}, ${formData.roadName}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.district}, ${formData.state} - ${formData.pincode}`;
                const estDelivery = calculateEstDelivery(formData.pincode);
                setSuccessDeliveryDate(estDelivery);

                const currentUser = window.AuthManager ? window.AuthManager.getUser() : null;
                const userEmail = currentUser ? currentUser.email : 'guest@qryntox.com';
                const userId = currentUser ? currentUser.id || currentUser.email : 'guest_' + Date.now();

                let orderData = {
                    objectId: 'ord-' + Date.now(),
                    createdAt: new Date().toISOString(),
                    objectData: {
                        orderId: orderId,
                        customerName: formData.name,
                        customerPhone: formData.mobile,
                        shippingAddress: fullAddress,
                        total: `₹${total.toFixed(2)}`,
                        status: 'Awaiting Confirmation',
                        paymentStatus: 'COD',
                        paymentId: 'COD',
                        utr: 'Pending Delivery',
                        items: JSON.stringify(items),
                        customerEmail: userEmail,
                        isAutoSecure: total > 2500,
                        estimatedDeliveryDate: estDelivery,
                        estDelivery: estDelivery
                    }
                };
                
                try {
                    if (window.trickleCreateObject) {
                        // 1. Save Customer Profile to 'users' table
                        await window.trickleCreateObject('users', {
                            googleId: userId,
                            email: userEmail,
                            name: formData.name,
                            profileData: JSON.stringify({
                                phone: formData.mobile,
                                address: {
                                    houseNo: formData.houseNo,
                                    roadName: formData.roadName,
                                    city: formData.city,
                                    state: formData.state,
                                    pincode: formData.pincode,
                                    district: formData.district
                                }
                            })
                        });
                        
                        // 2. Save order strictly to the user's phone isolated path
                        const dbOrder = await window.trickleCreateObject(`orders:${formData.mobile}`, orderData.objectData);
                        orderData = dbOrder;
                    }
                } catch (e) {
                    console.error('Failed to save to DB, continuing with local storage fallback', e);
                }
                
                try {
                    const localKey = `qryntox_orders_${formData.mobile}`;
                    const localOrders = JSON.parse(localStorage.getItem(localKey) || '[]');
                    localOrders.unshift(orderData);
                    localStorage.setItem(localKey, JSON.stringify(localOrders));
                    
                    await updateStockInDB(items);

                    if (!isBuyNow && window.CartManager && typeof window.CartManager.clearCart === 'function') {
                        window.CartManager.clearCart();
                    }
                } catch (localErr) {
                    console.error('Local order save error:', localErr);
                }
                
                const coinSound = document.getElementById('coinSound');
                if (coinSound) {
                    coinSound.volume = 0.6;
                    coinSound.play().catch(e => console.log('Audio wait:', e));
                }

                // Guarantee success transition to avoid blocking user
                setStatus('success');
                setTimeout(() => {
                    setStep('success');
                }, 800);
            } catch(err) {
                console.error("Critical COD Setup Error:", err);
                setStatus('error');
                setApiError('Unable to process order data. Please check your connection or contact support.');
            }
            return;
        }


    };

    const handleWhatsAppPay = async () => {
        setStatus('processing');
        try {
            const fullAddress = `${formData.houseNo}, ${formData.roadName}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.district}, ${formData.state} - ${formData.pincode}`;
            const estDelivery = calculateEstDelivery(formData.pincode);
            setSuccessDeliveryDate(estDelivery);

            const currentUser = window.AuthManager ? window.AuthManager.getUser() : null;
            const userEmail = currentUser ? currentUser.email : 'guest@qryntox.com';
            const userId = currentUser ? currentUser.id || currentUser.email : 'guest_' + Date.now();

            let orderData = {
                objectId: 'ord-' + Date.now(),
                createdAt: new Date().toISOString(),
                objectData: {
                    orderId: orderId,
                    customerName: formData.name,
                    customerPhone: formData.mobile,
                    shippingAddress: fullAddress,
                    total: `₹${total.toFixed(2)}`,
                    status: 'Pending',
                    paymentStatus: 'Pending Verification',
                    paymentId: 'WhatsApp Manual Payment',
                    utr: 'Pending',
                    items: JSON.stringify(items),
                    customerEmail: userEmail,
                    estimatedDeliveryDate: estDelivery,
                    estDelivery: estDelivery
                }
            };
            
            if (window.trickleCreateObject) {
                try {
                    // 1. Save Customer Profile
                    await window.trickleCreateObject('Customers', {
                        uid: userId,
                        Profile: {
                            FullName: formData.name,
                            Phone: formData.mobile,
                            DefaultAddress: {
                                Building: formData.houseNo,
                                Street: formData.roadName,
                                City: formData.city,
                                State: formData.state,
                                Pincode: formData.pincode
                            }
                        }
                    });
                    // 2. Save strictly to the user's phone isolated path
                    const dbOrder = await window.trickleCreateObject(`orders:${formData.mobile}`, orderData.objectData);
                    orderData = dbOrder;
                } catch (e) {}
            }
            
            const localKey = `qryntox_orders_${formData.mobile}`;
            const localOrders = JSON.parse(localStorage.getItem(localKey) || '[]');
            localOrders.unshift(orderData);
            localStorage.setItem(localKey, JSON.stringify(localOrders));
            
            await updateStockInDB(items);

            if (!isBuyNow) {
                window.CartManager.clearCart();
            }
            
            const coinSound = document.getElementById('coinSound');
            if (coinSound) {
                coinSound.volume = 0.6;
                coinSound.play().catch(e => console.log('Audio wait:', e));
            }

            // Format WhatsApp Message
            const message = `Hello QRYNTOX Team! 👋\n\nI'd like to place an order via manual payment (KYC Pending Fallback).\n\n*Order Details:*\n- Order ID: ${orderId}\n- Name: ${formData.name}\n- Total Amount: ₹${total.toFixed(2)}\n\nPlease share your UPI ID or payment link to complete this order.`;
            // Redirect to admin's WhatsApp number
            const waUrl = `https://wa.me/919999999999?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');

            setStatus('success');
            setStep('success');
        } catch (err) {
            console.log("WhatsApp order fallback.");
            setStatus('error');
            setApiError('Failed to process WhatsApp order.');
        }
    };

    if (step === 'success') {
        const isSingleItem = items && items.length === 1;
        const itemName = isSingleItem && items[0].name ? items[0].name : 'items';

        return (
            <div className="container mx-auto px-6 py-32 text-center max-w-lg bg-white">
                <i className="icon-circle-check text-7xl text-[#111111] mb-8 mx-auto inline-block animate-pop origin-center"></i>
                        <h1 className="text-4xl font-serif font-bold mb-4 text-[#111111] tracking-tight">Order Secured</h1>
                        <p className="text-[#777777] mb-4 text-sm leading-relaxed">
                            Your <span className="font-bold text-[#111111]">{itemName}</span> {isSingleItem ? 'is' : 'are'} now located.
                        </p>
                        <p className="text-[#111111] font-bold mb-2 text-sm">
                            Total Amount: ₹{total.toFixed(2)}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-black font-bold mb-10 border border-gray-200 py-3 px-6 rounded-sm bg-gray-50 inline-flex">
                            <i className="icon-truck text-xl"></i>
                            <span className="text-sm">Estimated Arrival: {successDeliveryDate}</span>
                        </div>
                        <br/>
                        <a href="profile.html" className="inline-flex px-10 py-5 bg-[#111111] text-white font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-transform hover:-translate-y-1 rounded-sm shadow-xl mt-2">
                            VIEW MY ORDER
                        </a>
                        <div className="mt-12">
                            <button onClick={() => setShowTermsModal(true)} className="text-[10px] text-[#999999] hover:text-[#111111] uppercase tracking-widest underline decoration-1 underline-offset-2 transition-colors">Terms & Conditions</button>
                        </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-6xl bg-white font-sans text-[#111111]" data-name="checkout-page" data-file="components/CheckoutPage.js">
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-center max-w-lg mx-auto mb-10">
                <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${step === 'summary' ? 'text-black' : 'text-[#777777]'}`}>SUMMARY</span>
                    <div className={`w-2 h-2 rounded-full ${step === 'summary' ? 'bg-[#111111]' : 'bg-[#E0E0E0]'}`}></div>
                </div>
                <div className="flex-1 h-px bg-[#E0E0E0] mx-4 mt-4"></div>
                <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${step === 'address' ? 'text-black' : 'text-[#777777]'}`}>ADDRESS</span>
                    <div className={`w-2 h-2 rounded-full ${step === 'address' ? 'bg-[#111111]' : 'bg-[#E0E0E0]'}`}></div>
                </div>
                <div className="flex-1 h-px bg-[#E0E0E0] mx-4 mt-4"></div>
                <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${step === 'payment' ? 'text-black' : 'text-[#777777]'}`}>PAYMENT</span>
                    <div className={`w-2 h-2 rounded-full ${step === 'payment' ? 'bg-[#111111]' : 'bg-[#E0E0E0]'}`}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column */}
                <div className="lg:col-span-7">
                    {step === 'summary' ? (
                        <div className="animate-fade-in space-y-6">
                            <h2 className="text-xs font-bold tracking-widest text-[#111111] mb-4 uppercase">Review Your Order</h2>
                            <div className="bg-gray-50 border border-[#E0E0E0] p-6 rounded-sm">
                                <div className="space-y-4">
                                    {(!items || items.length === 0) ? <p className="text-[#777777] text-sm">Your cart is empty.</p> : items.map((item, idx) => {
                                        if (!item) return null;
                                        return (
                                        <div key={idx} className="flex justify-between items-center border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-20 bg-white border border-[#E0E0E0] rounded-sm overflow-hidden shrink-0">
                                                    {item.image ? <img src={item.image} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} /> : <div className="w-full h-full flex items-center justify-center bg-gray-50"><i className="icon-image text-[#E0E0E0] text-xl"></i></div>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#111111] leading-tight mb-1">{item.name || 'Product'}</p>
                                                    {item.size && <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest">Size: {item.size}</p>}
                                                    <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest mt-1">Qty: {item.quantity || 1}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[#111111]">{item.price || '₹0'}</p>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-[#F8F8F8] p-4 border border-[#E0E0E0] rounded-sm">
                                <span className="font-bold text-[#111111] uppercase tracking-widest text-sm">Subtotal</span>
                                <span className="text-xl font-bold text-[#111111]">₹{total.toFixed(2)}</span>
                            </div>
                            <button onClick={() => { setStep('address'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={items.length === 0} className="w-full bg-[#111111] text-white font-bold text-sm tracking-widest py-4 rounded-sm hover:bg-black transition-colors flex justify-center items-center shadow-md">
                                CONFIRM DETAILS
                            </button>
                        </div>
                    ) : step === 'address' ? (
                        <form onSubmit={handleContinue} className="space-y-10 animate-fade-in">
                            
                            {/* Shipping Address Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-bold tracking-widest text-[#111111] uppercase">Shipping Address</h2>
                                    <a href="products.html" className="text-[10px] font-bold text-[#777777] uppercase tracking-widest hover:text-black">Back to Cart</a>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Name" 
                                            className={`w-full bg-white border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.name || ''}
                                            onChange={e => {setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''});}}
                                        />
                                        {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
                                    </div>
                                    
                                    <div>
                                        <input 
                                            type="tel" 
                                            maxLength="10"
                                            placeholder="Mobile Number (10 digits)" 
                                            className={`w-full bg-white border ${errors.mobile ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.mobile || ''}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setFormData({...formData, mobile: val});
                                                setErrors({...errors, mobile: ''});
                                            }}
                                        />
                                        {errors.mobile && <p className="text-xs text-red-500 mt-1.5">{errors.mobile}</p>}
                                    </div>

                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="House No./Building Name" 
                                            className={`w-full bg-white border ${errors.houseNo ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.houseNo || ''}
                                            onChange={e => {setFormData({...formData, houseNo: e.target.value}); setErrors({...errors, houseNo: ''});}}
                                        />
                                        {errors.houseNo && <p className="text-xs text-red-500 mt-1.5">{errors.houseNo}</p>}
                                    </div>
                                    
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Road Name/Area/Colony" 
                                            className={`w-full bg-white border ${errors.roadName ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.roadName || ''}
                                            onChange={e => {setFormData({...formData, roadName: e.target.value}); setErrors({...errors, roadName: ''});}}
                                        />
                                        {errors.roadName && <p className="text-xs text-red-500 mt-1.5">{errors.roadName}</p>}
                                    </div>
                                    
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Add Nearby Famous Shop/Mall/Landmark (Optional)" 
                                            className="w-full bg-white border border-[#E0E0E0] rounded-sm px-4 py-3.5 text-sm focus:outline-none focus:border-black text-[#111111] transition-colors" 
                                            value={formData.landmark || ''}
                                            onChange={e => setFormData({...formData, landmark: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <input 
                                            type="text" 
                                            maxLength="6"
                                            placeholder="Pincode" 
                                            className={`w-full bg-white border ${errors.pincode ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.pincode || ''}
                                            onChange={handlePincodeChange}
                                        />
                                        {errors.pincode && <p className="text-xs text-red-500 mt-1.5">{errors.pincode}</p>}
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                placeholder="City" 
                                                className={`w-full bg-white border ${errors.city ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                                value={formData.city || ''}
                                                onChange={e => {setFormData({...formData, city: e.target.value}); setErrors({...errors, city: ''});}}
                                            />
                                            {errors.city && <p className="text-xs text-red-500 mt-1.5">{errors.city}</p>}
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                placeholder="District" 
                                                className={`w-full bg-white border ${errors.district ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                                value={formData.district || ''}
                                                onChange={e => {setFormData({...formData, district: e.target.value}); setErrors({...errors, district: ''});}}
                                            />
                                            {errors.district && <p className="text-xs text-red-500 mt-1.5">{errors.district}</p>}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="State" 
                                            className={`w-full bg-white border ${errors.state ? 'border-red-500 focus:border-red-500' : 'border-[#E0E0E0] focus:border-black'} rounded-sm px-4 py-3.5 text-sm focus:outline-none text-[#111111] transition-colors`} 
                                            value={formData.state || ''}
                                            onChange={e => {setFormData({...formData, state: e.target.value}); setErrors({...errors, state: ''});}}
                                        />
                                        {errors.state && <p className="text-xs text-red-500 mt-1.5">{errors.state}</p>}
                                    </div>
                                </div>
                                

                            </div>

                            <button type="submit" disabled={items.length === 0} className="w-full bg-[#111111] text-white font-bold text-sm tracking-widest py-4 rounded-sm hover:bg-black transition-colors flex justify-center items-center shadow-md">
                                CONTINUE TO PAYMENT
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); setShowPrePaymentTerms(true); }} className="space-y-10 animate-fade-in">
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xs font-bold tracking-widest text-[#111111] uppercase">Payment Details</h2>
                                    <button type="button" onClick={() => setStep('address')} className="text-[10px] font-bold text-[#777777] uppercase tracking-widest hover:text-black">Back to Address</button>
                                </div>
                                
                                <div className="space-y-4 mb-6">
                                    <label className={`border-2 rounded-sm p-4 flex items-center gap-3 cursor-pointer transition-colors ${paymentMethod === 'prepaid' ? 'border-[#111111] bg-gray-50' : 'border-[#E0E0E0] bg-white'}`}>
                                        <input type="radio" name="payment_method" value="prepaid" checked={paymentMethod === 'prepaid'} onChange={() => setPaymentMethod('prepaid')} className="w-4 h-4 accent-black" />
                                        <div className="flex-1 flex justify-between items-center">
                                            <span className="font-bold text-sm text-[#111111]">Razorpay Secure (Prepaid)</span>
                                            <div className="flex gap-2 text-gray-500"><i className="icon-credit-card"></i></div>
                                        </div>
                                    </label>
                                    <label className={`border-2 rounded-sm p-4 flex items-center gap-3 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-[#111111] bg-gray-50' : 'border-[#E0E0E0] bg-white'}`}>
                                        <input type="radio" name="payment_method" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4 accent-black" />
                                        <div className="flex-1 flex justify-between items-center">
                                            <span className="font-bold text-sm text-[#111111]">Cash on Delivery (COD)</span>
                                            <div className="flex gap-2 text-gray-500"><i className="icon-indian-rupee"></i></div>
                                        </div>
                                    </label>
                                </div>
                                {paymentMethod === 'prepaid' ? (
                                    <p className="text-xs text-[#777777] leading-relaxed">
                                        You will be redirected to Razorpay to securely complete your purchase. Supports UPI, Credit/Debit Cards, NetBanking, and Wallets.
                                    </p>
                                ) : (
                                    <p className="text-xs text-[#777777] leading-relaxed">
                                        Pay via Cash or UPI when your order arrives. Your order will require confirmation before shipping.
                                    </p>
                                )}
                            </div>

                            {apiError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-sm flex items-start gap-3">
                                    <i className="icon-circle-alert mt-0.5 shrink-0"></i>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Integration Error</p>
                                        <p className="text-sm">{apiError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button type="submit" disabled={status === 'processing' || status === 'success' || items.length === 0} className="w-full bg-[#111111] text-white font-bold text-sm tracking-widest py-4 rounded-sm hover:bg-black transition-colors flex justify-center items-center gap-2 shadow-md disabled:opacity-75 disabled:cursor-not-allowed">
                                    {status === 'processing' ? <i className="icon-loader animate-spin text-lg"></i> : status === 'success' ? <i className="icon-check text-lg"></i> : <i className="icon-lock text-sm"></i>} 
                                    {status === 'processing' ? 'PROCESSING...' : status === 'success' ? 'ORDER SUCCESSFUL' : paymentMethod === 'cod' ? `PLACE ORDER VIA COD (₹${total.toFixed(2)})` : `PAY VIA RAZORPAY (₹${total.toFixed(2)})`}
                                </button>
                                <p className="text-[10px] text-[#999999] text-center mt-1">
                                    By placing an order, you agree to our <button type="button" onClick={() => setShowTermsModal(true)} className="underline hover:text-[#111111] transition-colors">Terms & Conditions</button>.
                                </p>
                                <div className="flex justify-center items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                    <span className="flex items-center gap-1"><i className="icon-shield-check text-green-600 text-sm"></i> Secure SSL</span>
                                    <span className="flex items-center gap-1"><i className="icon-badge-check text-blue-600 text-sm"></i> Razorpay Verified</span>
                                </div>
                            </div>
                            {status === 'error' && <p className="text-red-500 text-sm mt-2 text-center font-medium">Error processing checkout. Please try again.</p>}
                        </form>
                    )}
                </div>

                {/* Right Column: Sticky Order Summary */}
                <div className="lg:col-span-5 mt-10 lg:mt-0">
                    <div className="sticky top-28 bg-[#FDFDFD] border border-[#E0E0E0] p-6 md:p-8 rounded-sm">
                        <h2 className="text-xs font-bold text-[#111111] tracking-widest uppercase mb-6 pb-4 border-b border-[#E0E0E0]">Order Summary</h2>
                        
                        <div className="space-y-5 mb-6 max-h-80 overflow-y-auto pr-2 hide-scrollbar">
                            {(!items || items.length === 0) ? <p className="text-[#777777] text-sm">Your cart is empty.</p> : items.map((item, idx) => {
                                if (!item) return null;
                                return (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-16 h-20 bg-white border border-[#E0E0E0] rounded-sm overflow-hidden shrink-0">
                                        {item.image ? <img src={item.image} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} /> : <div className="w-full h-full flex items-center justify-center bg-gray-50"><i className="icon-image text-[#E0E0E0] text-xl"></i></div>}
                                    </div>
                                    <div className="flex-1 py-1">
                                        <p className="text-sm font-bold text-[#111111] leading-tight mb-1">{item.name || 'Product'}</p>
                                        {item.size && <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest">Size: {item.size}</p>}
                                        <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest mt-1">Qty: {item.quantity || 1}</p>
                                    </div>
                                    <div className="py-1">
                                        <p className="text-sm font-bold text-[#111111]">{item.price || '₹0'}</p>
                                    </div>
                                </div>
                            )})}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-[#E0E0E0] text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#777777] font-medium">Total MRP</span>
                                <span className="text-[#111111] font-bold">₹{total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#777777] font-medium">Discount on MRP</span>
                                <span className="text-green-600 font-bold">-₹0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#777777] font-medium">Shipping Fee</span>
                                <span className="text-green-600 font-bold">FREE</span>
                            </div>
                        </div>

                        <div className="border-t border-[#E0E0E0] pt-5 mt-5 flex justify-between items-center">
                            <span className="font-bold text-[#111111] uppercase tracking-widest text-sm">Total Amount</span>
                            <span className="text-2xl font-bold text-[#111111]">₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {showPrePaymentTerms && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 relative animate-slide-up shadow-2xl rounded-sm text-center border border-gray-200">
                        <button onClick={() => setShowPrePaymentTerms(false)} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        <h3 className="text-xl font-serif font-bold mb-4 text-black tracking-tight uppercase">Return Policy</h3>
                        <p className="text-sm font-medium text-black mb-8 leading-relaxed">
                            Returns accepted within 2 days ONLY for damaged products.
                        </p>
                        <button 
                            onClick={() => { setShowPrePaymentTerms(false); executeCheckout(); }}
                            className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-sm"
                        >
                            I Agree
                        </button>
                    </div>
                </div>
            )}

            {showTermsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 relative animate-slide-up shadow-2xl rounded-sm">
                        <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        <h3 className="text-xl font-serif font-bold mb-6 text-black tracking-tight border-b border-gray-100 pb-4 uppercase">Terms & Conditions</h3>
                        
                        <div className="space-y-5 mb-8 text-sm">
                            <div>
                                <h4 className="font-bold text-black uppercase tracking-widest text-[10px] mb-1">Founder</h4>
                                <p className="text-gray-600 font-medium">Shamjid (Malayali Founder, Thrissur)</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-black uppercase tracking-widest text-[10px] mb-1">Policy</h4>
                                <p className="text-gray-600 font-medium">Returns accepted within 2 days ONLY for damaged products.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-black uppercase tracking-widest text-[10px] mb-1">Shipping</h4>
                                <p className="text-gray-600 font-medium">Guaranteed 7-Day Delivery</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-black uppercase tracking-widest text-[10px] mb-1">Trust</h4>
                                <p className="text-gray-600 font-medium">100% Quality Inspected</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowTermsModal(false)}
                            className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-sm"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
