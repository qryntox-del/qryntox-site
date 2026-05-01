function ProductDetail() {
    const [product, setProduct] = React.useState(null);
    const [recommendations, setRecommendations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [selectedSize, setSelectedSize] = React.useState(null);
    const [showError, setShowError] = React.useState(false);
    const [mainImageIndex, setMainImageIndex] = React.useState(0);
    const [showShare, setShowShare] = React.useState(false);
    const [shareToast, setShareToast] = React.useState('');
    const [reviewToDelete, setReviewToDelete] = React.useState(null);
    
    const [reviews, setReviews] = React.useState([]);
    const [reviewForm, setReviewForm] = React.useState({ name: '', rating: 5, comment: '', images: [] });
    const [showReviewForm, setShowReviewForm] = React.useState(false);
    const [helpfulClicks, setHelpfulClicks] = React.useState({});
    const [enlargedImage, setEnlargedImage] = React.useState(null);
    const [quantity, setQuantity] = React.useState(1);
    const [pincode, setPincode] = React.useState('');
    const [deliveryStatus, setDeliveryStatus] = React.useState(null);

    const handleCheckDelivery = () => {
        if (!pincode || pincode.length < 6) return;
        setDeliveryStatus('checking');
        // Simulate API call
        setTimeout(() => {
            if (pincode.endsWith('00')) {
                setDeliveryStatus('unavailable');
            } else {
                setDeliveryStatus('available');
            }
        }, 1000);
    };

    React.useEffect(() => {
        const loadProductData = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            
            if (!id) {
                setError('No product ID provided');
                setLoading(false);
                return;
            }

            try {
                // Fetch product directly from Firebase or Trickle DB as fallback
                let foundProduct = null;
                let finalProducts = [];
                
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const docSnap = await db.collection('products').doc(id).get();
                    if (docSnap.exists) {
                        foundProduct = { objectId: docSnap.id, objectData: docSnap.data() };
                    }
                    
                    const snapshot = await db.collection('products').limit(10).get();
                    finalProducts = snapshot.docs.map(doc => ({
                        objectId: doc.id,
                        objectData: doc.data()
                    }));
                } else {
                    foundProduct = await window.trickleGetObject('products', id);
                    const allProdsRes = await window.trickleListObjects('products', 10, true);
                    finalProducts = allProdsRes.items || [];
                }

                if (!foundProduct || !foundProduct.objectData) {
                    setError('Product not found in archive.');
                    setLoading(false);
                    return;
                }

                setProduct(foundProduct);
                setReviews(foundProduct.objectData.reviews || []);
                
                // Filter recommendations
                setRecommendations(finalProducts.filter(p => p.objectId !== id && p.objectData?.status !== 'Draft').slice(0, 4));
                
                setError('');
            } catch (err) {
                console.error("Product fetch error:", err);
                setError('Failed to load product. It might have been removed.');
            } finally {
                setLoading(false);
            }
        };

        loadProductData();
        window.addEventListener('productsUpdated', loadProductData);
        return () => {
            window.removeEventListener('productsUpdated', loadProductData);
        };
    }, []);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: product?.objectData?.name || 'QRYNTOX Product',
                    text: 'Explore this archival piece on QRYNTOX.',
                    url: window.location.href
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setShowShare(true);
                }
            }
        } else {
            setShowShare(true);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setShareToast('LINK COPIED');
        setTimeout(() => setShareToast(''), 3000);
        setShowShare(false);
    };

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`Explore ${product?.objectData?.name || 'this piece'} on QRYNTOX: ${window.location.href}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setShowShare(false);
    };

    const handleInstagramShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setShareToast('LINK COPIED FOR INSTAGRAM');
        setTimeout(() => setShareToast(''), 3000);
        window.open('https://instagram.com', '_blank');
        setShowShare(false);
    };

    const handleHelpfulClick = (reviewId) => {
        setHelpfulClicks(prev => ({
            ...prev,
            [reviewId]: !prev[reviewId]
        }));
    };

    const handleReviewImageUpload = (e) => {
        const files = Array.from(e.target.files);
        Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        })).then(base64Images => {
            const validImages = base64Images.filter(img => img);
            setReviewForm(prev => ({ ...prev, images: [...prev.images, ...validImages] }));
        });
    };

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        if (!reviewForm.name.trim() || !reviewForm.comment.trim()) return;
        
        const now = new Date();
        const newReview = {
            id: Date.now(),
            name: reviewForm.name,
            rating: reviewForm.rating,
            comment: reviewForm.comment,
            images: reviewForm.images,
            date: (window.formatDateIST ? window.formatDateIST(now.toISOString()) : now.toISOString()),
            rawDate: now.toISOString()
        };
        
        const updatedReviews = [newReview, ...reviews];
        setReviews(updatedReviews);
        
        const updatedProduct = {
            ...product,
            objectData: {
                ...product.objectData,
                reviews: updatedReviews
            }
        };
        setProduct(updatedProduct);
        
        // Sync review to live database
        const updatePromise = (window.firebase && window.firebase.firestore) 
            ? window.firebase.firestore().collection('products').doc(product.objectId).update(updatedProduct.objectData)
            : window.trickleUpdateObject('products', product.objectId, updatedProduct.objectData);
            
        updatePromise
            .then(() => window.dispatchEvent(new Event('productsUpdated')))
            .catch(err => console.error('Failed to save review to database', err));
        
        setReviewForm({ name: '', rating: 5, comment: '', images: [] });
    };

    const confirmDeleteReview = (id) => {
        setReviewToDelete(id);
    };

    const handleDeleteReview = () => {
        if (!reviewToDelete) return;
        
        const updatedReviews = reviews.filter(r => r.id !== reviewToDelete);
        setReviews(updatedReviews);
        
        const updatedProduct = {
            ...product,
            objectData: {
                ...product.objectData,
                reviews: updatedReviews
            }
        };
        setProduct(updatedProduct);
        
        // Sync deletion to live database
        const updatePromise = (window.firebase && window.firebase.firestore) 
            ? window.firebase.firestore().collection('products').doc(product.objectId).update(updatedProduct.objectData)
            : window.trickleUpdateObject('products', product.objectId, updatedProduct.objectData);
            
        updatePromise
            .then(() => window.dispatchEvent(new Event('productsUpdated')))
            .catch(err => console.error('Failed to delete review from database', err));
        
        setReviewToDelete(null);
    };

    if (loading) return <div className="flex justify-center py-32"><i className="icon-loader animate-spin text-4xl text-[#777777]"></i></div>;
    if (error || !product) return <div className="text-center py-32 text-red-500">{String(error || 'Product not found')}</div>;

    const data = product.objectData;
    const stock = parseInt(data.stock, 10) || 0;
    const isOutOfStock = data.inStock === false || stock === 0;
    const images = data.images && data.images.length > 0 ? data.images : [data.image];
    const hasSizes = data.sizes && Array.isArray(data.sizes) && data.sizes.length > 0;
    
    const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) 
        : 0;
        
    const allReviewPhotos = reviews.reduce((acc, review) => {
        if (review.images && review.images.length > 0) {
            return [...acc, ...review.images];
        }
        return acc;
    }, []);

    return (
        <div className="bg-white min-h-screen text-[#111111]" data-name="product-detail" data-file="components/ProductDetail.js">
            {/* Breadcrumbs & Container */}
            <div className="container mx-auto px-6 py-6 md:py-12">
                <div className="flex justify-end mb-6 md:mb-0">
                    <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest">
                        <a href="index.html" className="hover:text-black transition-colors">HOME</a> 
                        <span className="mx-2">/</span> 
                        <a href="products.html" className="hover:text-black transition-colors">ALL</a> 
                        <span className="mx-2">/</span> 
                        <a href={`products.html?category=${encodeURIComponent(data.category || 'PRODUCT')}`} className="hover:text-black transition-colors">{data.category || 'PRODUCT'}</a>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 relative">
                    
                    {/* Left: Image Gallery */}
                    <div className="relative animate-slide-up">
                        {/* Main Image with Zoom effect */}
                        <div className="bg-[#F8F8F8] aspect-[3/4] md:aspect-[4/5] relative overflow-hidden group cursor-crosshair">
                            {isOutOfStock && (
                                <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="bg-black text-white px-6 py-2 text-xs font-bold tracking-[0.2em] uppercase">Out of Stock</span>
                                </div>
                            )}
                            {images[mainImageIndex] ? (
                                <img 
                                    loading="lazy"
                                    src={images[mainImageIndex]} 
                                    alt={data.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><i className="icon-image text-6xl text-[#E0E0E0]"></i></div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-4 mt-4 overflow-x-auto hide-scrollbar">
                                {images.map((img, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setMainImageIndex(idx)}
                                        className={`w-20 aspect-[3/4] shrink-0 bg-[#F8F8F8] overflow-hidden transition-all ${mainImageIndex === idx ? 'border-2 border-black' : 'opacity-60 hover:opacity-100'}`}
                                    >
                                        <img loading="lazy" src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Info Panel (Sticky on Desktop) */}
                    <div className="md:sticky md:top-24 h-fit animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="mb-8">
                            <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#111111] mb-4 leading-tight tracking-tight capitalize">
                                {data.name}
                            </h1>
                            <p className="text-xl font-medium text-[#111111]">{data.price}</p>
                            {isOutOfStock && <p className="text-red-500 text-sm font-bold mt-2">Out of Stock</p>}
                        </div>

                        {/* Size Selection */}
                        {hasSizes && (
                            <div className={`mb-10 ${showError ? 'animate-shake' : ''}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Select Size</h3>
                                    {showError && <span className="text-xs text-red-500 font-medium">Please select a size</span>}
                                </div>
                                
                                <div className="flex flex-wrap gap-3">
                                    {(data.variants && data.variants.length > 0 ? data.variants : data.sizes.map(s => ({ size: s, stock_quantity: data.stock }))).map(variant => {
                                        const isVariantOutOfStock = parseInt(variant.stock_quantity, 10) === 0;
                                        const isLowStock = !isVariantOutOfStock && parseInt(variant.stock_quantity, 10) <= 3;
                                        return (
                                        <div key={variant.size} className="flex flex-col items-center">
                                            <button 
                                                disabled={isVariantOutOfStock}
                                                onClick={() => { setSelectedSize(variant.size); setShowError(false); setQuantity(1); }}
                                                className={`w-16 h-12 flex items-center justify-center border text-sm font-medium transition-colors ${
                                                    isVariantOutOfStock ? 'opacity-50 line-through cursor-not-allowed border-[#E0E0E0] text-[#777]' :
                                                    selectedSize === variant.size 
                                                        ? 'border-black bg-black text-white' 
                                                        : 'border-[#E0E0E0] text-[#111111] bg-white hover:border-black'
                                                }`}
                                            >
                                                {variant.size}
                                            </button>
                                            {isLowStock && <span className="text-[9px] text-red-500 font-bold mt-1 uppercase">Only {variant.stock_quantity} left!</span>}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        <div className="mb-10">
                            {(() => {
                                const selectedVariant = data.variants?.find(v => v.size === selectedSize);
                                const maxQty = selectedVariant ? selectedVariant.stock_quantity : stock;
                                return (
                                    <>
                            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">Quantity</h3>
                            <div className="inline-flex items-center border border-[#E0E0E0] h-12 bg-white rounded-sm">
                                <button 
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-12 h-full flex items-center justify-center text-[#111111] hover:bg-[#F8F8F8] transition-colors"
                                >
                                    <i className="icon-minus text-sm"></i>
                                </button>
                                <div className="w-12 h-full flex items-center justify-center border-x border-[#E0E0E0] text-sm font-bold text-[#111111]">
                                    {quantity}
                                </div>
                                <button 
                                    onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                                    disabled={quantity >= maxQty}
                                    className={`w-12 h-full flex items-center justify-center text-[#111111] transition-colors ${quantity >= maxQty ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F8F8F8]'}`}
                                >
                                    <i className="icon-plus text-sm"></i>
                                </button>
                            </div>
                            </>
                            );})()}
                        </div>

                        {/* Delivery Check */}
                        <div className="mb-10">
                            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">Delivery & Services</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex border border-[#E0E0E0] h-12 bg-white rounded-sm overflow-hidden focus-within:border-black transition-colors w-full md:w-3/4">
                                    <div className="flex items-center px-4 text-[#777777]">
                                        <i className="icon-map-pin text-sm"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Enter Delivery Pincode" 
                                        value={pincode}
                                        onChange={(e) => {
                                            setPincode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                                            if (deliveryStatus) setDeliveryStatus(null);
                                        }}
                                        className="flex-1 bg-transparent text-sm focus:outline-none font-sans"
                                    />
                                    <button 
                                        onClick={handleCheckDelivery}
                                        disabled={pincode.length < 6 || deliveryStatus === 'checking'}
                                        className="px-6 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {deliveryStatus === 'checking' ? 'Checking...' : 'Check'}
                                    </button>
                                </div>
                                <div className="h-4">
                                    {deliveryStatus === 'available' && (
                                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <i className="icon-circle-check text-[10px]"></i> Delivery available for {pincode}. Standard delivery in 3-5 days.
                                        </p>
                                    )}
                                    {deliveryStatus === 'unavailable' && (
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                            <i className="icon-circle-x text-[10px]"></i> Sorry, we do not deliver to {pincode} currently.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4 mb-12">
                            <button 
                                onClick={() => {
                                    if(!isOutOfStock && quantity <= stock) {
                                        if (hasSizes && !selectedSize) {
                                            setShowError(true);
                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'PLEASE SELECT A SIZE' }));
                                            setTimeout(() => setShowError(false), 2000);
                                            window.scrollBy({ top: -150, behavior: 'smooth' });
                                            return;
                                        }
                                        
                                        const selectedVariant = data.variants?.find(v => v.size === selectedSize);
                                        const maxStock = selectedVariant ? selectedVariant.stock_quantity : stock;
                                        
                                        if (maxStock === 0) {
                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'OUT OF STOCK' }));
                                            return;
                                        }

                                        const existingCart = window.CartManager.getItems();
                                        const existingItem = existingCart.find(i => i.id === product.objectId && (i.size || null) === (hasSizes ? selectedSize : null));
                                        const currentCartQty = existingItem ? existingItem.quantity : 0;
                                        if (currentCartQty + quantity > maxStock) {
                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'LIMITED STOCK' }));
                                            return;
                                        }

                                        const itemPrice = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 0;
                                        if (window.trackGAEvent) {
                                            window.trackGAEvent('begin_checkout', {
                                                currency: 'INR',
                                                value: itemPrice * quantity,
                                                items: [{ item_id: product.objectId, item_name: data.name, price: itemPrice, quantity }]
                                            });
                                        }
                                        
                                        // Save product to local storage for checkout retrieval
                                        try {
                                            const localProducts = JSON.parse(localStorage.getItem('qryntox_local_products') || '[]');
                                            const existingIndex = localProducts.findIndex(p => p.objectId === product.objectId);
                                            if (existingIndex >= 0) {
                                                localProducts[existingIndex] = product;
                                            } else {
                                                localProducts.push(product);
                                            }
                                            localStorage.setItem('qryntox_local_products', JSON.stringify(localProducts));
                                        } catch(e) {}

                                        window.location.href = `checkout.html?buyNow=${product.objectId}&qty=${quantity}${hasSizes && selectedSize ? `&size=${selectedSize}` : ''}`;
                                    }
                                }} 
                                disabled={isOutOfStock}
                                className={`w-full text-xs uppercase tracking-widest py-5 font-sans transition-all duration-300 ${isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-[#4B3D21] font-bold border border-[#D4AF37] shadow-[0_4px_6px_rgba(0,0,0,0.1)] hover:brightness-110 hover:shadow-[0_0_12px_rgba(242,208,107,0.6)]'}`}
                                style={!isOutOfStock ? { background: 'linear-gradient(45deg, #F2D06B 0%, #F2D06B 40%, rgba(255, 255, 255, 0.4) 50%, #F2D06B 60%, #F2D06B 100%)' } : {}}
                            >
                                {isOutOfStock ? 'OUT OF STOCK' : 'BUY NOW'}
                            </button>
                            <button 
                                onClick={() => {
                                    if (!isOutOfStock && quantity <= stock) {
                                        if (hasSizes && !selectedSize) {
                                            setShowError(true);
                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'PLEASE SELECT A SIZE' }));
                                            setTimeout(() => setShowError(false), 2000);
                                            window.scrollBy({ top: -150, behavior: 'smooth' });
                                            return;
                                        }
                                        
                                        const selectedVariant = data.variants?.find(v => v.size === selectedSize);
                                        const maxStock = selectedVariant ? selectedVariant.stock_quantity : stock;
                                        
                                        if (maxStock === 0) {
                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'OUT OF STOCK' }));
                                            return;
                                        }
                                        const itemPrice = parseFloat(String(data.price).replace(/[^0-9.]/g, '')) || 0;
                                        if (window.trackGAEvent) {
                                            window.trackGAEvent('add_to_cart', {
                                                currency: 'INR',
                                                value: itemPrice * quantity,
                                                items: [{ item_id: product.objectId, item_name: data.name, price: itemPrice, quantity }]
                                            });
                                        }
                                        window.CartManager.addItem(product, quantity, hasSizes ? selectedSize : null);
                                        window.dispatchEvent(new CustomEvent('openCart', { detail: { mode: 'full' } }));
                                        window.dispatchEvent(new CustomEvent('showToast', { detail: 'PRODUCT IS IN CART' }));
                                    }
                                }}
                                disabled={isOutOfStock}
                                className="w-full bg-white border border-[#E0E0E0] text-[#111111] font-bold text-xs uppercase tracking-widest py-5 hover:border-black transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200"
                            >
                                ADD TO CART
                            </button>
                            <div className="pt-3 flex justify-center">
                                <button onClick={handleShare} className="flex items-center gap-2 text-[10px] font-bold text-[#777777] uppercase tracking-widest hover:text-[#111111] transition-colors">
                                    <i className="icon-share text-sm"></i> Share
                                </button>
                            </div>
                        </div>

                        {/* Track Order Direct Search */}
                        <div className="mb-12 border-t border-[#E0E0E0] pt-6">
                            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">Track My Order</h3>
                            <div className="flex border border-[#E0E0E0] h-12 bg-white rounded-sm overflow-hidden focus-within:border-black transition-colors w-full">
                                <input 
                                    type="text" 
                                    id="quickTrackInput"
                                    placeholder="Enter Order ID" 
                                    className="flex-1 px-4 bg-transparent text-sm focus:outline-none font-sans"
                                />
                                <button 
                                    onClick={() => {
                                        const val = document.getElementById('quickTrackInput').value.trim();
                                        if (val) window.location.href = `track.html?orderID=${encodeURIComponent(val)}`;
                                    }}
                                    className="px-6 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
                                >
                                    Track
                                </button>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="space-y-6 pt-8 border-t border-[#E0E0E0]">
                            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-widest">Details</h3>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-[#F8F8F8] pb-3">
                                    <span className="text-[#777777] uppercase tracking-wider text-[10px] font-bold">Material</span>
                                    <span className="text-[#111111] font-medium text-right">{data.material || '100% Premium Blend'}</span>
                                </div>
                                <div className="flex justify-between border-b border-[#F8F8F8] pb-3">
                                    <span className="text-[#777777] uppercase tracking-wider text-[10px] font-bold">Origin</span>
                                    <span className="text-[#111111] font-medium text-right">{data.origin || 'Imported'}</span>
                                </div>
                                <div className="flex justify-between pb-3">
                                    <span className="text-[#777777] uppercase tracking-wider text-[10px] font-bold">Care</span>
                                    <span className="text-[#111111] font-medium text-right">{data.care || 'Dry Clean Only'}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <p className="text-sm text-[#777777] leading-relaxed font-light">
                                    {data.description || 'Designed with an uncompromising attention to detail, this piece represents the pinnacle of minimalist aesthetics and functional form.'}
                                </p>
                            </div>
                        </div>

                        {/* REVIEWS SECTION (Meesho-inspired) */}
                        <div className="space-y-8 pt-12 mt-12 border-t border-[#E0E0E0]">
                            
                            {/* Header & Overall Rating */}
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-[#111111]">Customer Ratings & Reviews</h3>
                                    {reviews.length > 0 ? (
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="text-4xl font-bold text-[#111111]">{averageRating}</span>
                                            <div className="flex flex-col">
                                                <div className="flex text-black mb-1">
                                                    {[1,2,3,4,5].map(star => (
                                                        <i key={star} className={`icon-star text-sm ${star <= Math.round(averageRating) ? 'fill-current' : 'text-gray-300'}`}></i>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-[#777777] font-bold uppercase tracking-widest">{reviews.length} Verified Ratings</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#777777] mt-2 font-light">No ratings yet for this artifact.</p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setShowReviewForm(!showReviewForm)}
                                    className="bg-white border border-[#E0E0E0] text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:border-black transition-colors whitespace-nowrap"
                                >
                                    {showReviewForm ? 'Cancel Review' : 'Rate Product'}
                                </button>
                            </div>

                            {/* Real Customer Photos Horizontal Scroll */}
                            {allReviewPhotos.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-[#F8F8F8]">
                                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-4">Real Customer Photos</h4>
                                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                                        {allReviewPhotos.map((img, idx) => img ? (
                                            <div key={idx} onClick={() => setEnlargedImage(img)} className="w-[150px] h-[150px] shrink-0 rounded-sm overflow-hidden border border-[#E0E0E0] cursor-pointer hover:opacity-90 transition-opacity">
                                                <img loading="lazy" src={img} className="w-full h-full object-cover" alt="Customer review" />
                                            </div>
                                        ) : null)}
                                    </div>
                                </div>
                            )}
                            
                            {/* Review Form */}
                            {showReviewForm && (
                                <form onSubmit={(e) => { handleReviewSubmit(e); setShowReviewForm(false); }} className="bg-[#F8F8F8] p-6 md:p-8 mt-6 rounded-sm border border-[#E0E0E0] animate-slide-up">
                                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-widest mb-6">Write a Review</h4>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-3">Rating</label>
                                            <div className="flex gap-2">
                                                {[1,2,3,4,5].map(star => (
                                                    <button 
                                                        type="button" 
                                                        key={star} 
                                                        onClick={() => setReviewForm(prev => ({...prev, rating: star}))}
                                                        className="focus:outline-none transition-transform hover:scale-110"
                                                    >
                                                        <i className={`icon-star text-2xl ${star <= reviewForm.rating ? 'fill-current text-black' : 'text-gray-300'}`}></i>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">Name</label>
                                            <input required type="text" value={reviewForm.name} onChange={e => setReviewForm(prev => ({...prev, name: e.target.value}))} className="w-full bg-white border border-[#E0E0E0] px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors font-sans rounded-sm" placeholder="Your name" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">Comment</label>
                                            <textarea required value={reviewForm.comment} onChange={e => setReviewForm(prev => ({...prev, comment: e.target.value}))} rows="4" className="w-full bg-white border border-[#E0E0E0] px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors resize-none font-sans rounded-sm" placeholder="Share your thoughts..."></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">Photos (Optional)</label>
                                            <div className="mt-2">
                                                <input type="file" id="review-image-upload" multiple accept="image/*" onChange={handleReviewImageUpload} className="hidden" />
                                                <label htmlFor="review-image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#E0E0E0] bg-white hover:bg-gray-50 cursor-pointer rounded-sm transition-colors">
                                                    <i className="icon-camera text-3xl text-gray-400 mb-2"></i>
                                                    <span className="text-[10px] font-bold text-[#777777] uppercase tracking-widest">Add Photos</span>
                                                </label>
                                            </div>
                                            {reviewForm.images.length > 0 && (
                                                <div className="flex gap-4 mt-4 overflow-x-auto hide-scrollbar pb-2">
                                                    {reviewForm.images.map((img, idx) => img ? (
                                                        <div key={idx} className="relative w-[150px] h-[150px] shrink-0 group">
                                                            <img loading="lazy" src={img} className="w-full h-full object-cover border border-[#E0E0E0] rounded-sm" />
                                                            <button type="button" onClick={() => setReviewForm(prev => ({...prev, images: prev.images.filter((_, i) => i !== idx)}))} className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full w-6 h-6 flex items-center justify-center border border-[#E0E0E0] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"><i className="icon-x text-xs"></i></button>
                                                        </div>
                                                    ) : null)}
                                                </div>
                                            )}
                                        </div>
                                        <button type="submit" className="w-full bg-black text-white font-bold text-xs uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors mt-4 rounded-sm">
                                            Submit Review
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Reviews List */}
                            <div className="space-y-4 mt-8 pt-4">
                                {reviews.length === 0 ? (
                                    <div className="text-center py-10 bg-[#F8F8F8] border border-[#E0E0E0] rounded-sm">
                                        <i className="icon-message-square text-3xl text-gray-300 mb-3"></i>
                                        <p className="text-sm text-[#777777] font-light">Be the first to review this product.</p>
                                    </div>
                                ) : (
                                    reviews.map(review => (
                                        <div key={review.id} className="bg-white border border-[#E0E0E0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 md:p-6 rounded-sm hover:border-gray-300 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex text-black">
                                                        {[1,2,3,4,5].map(star => (
                                                            <i key={star} className={`icon-star text-[13px] ${star <= review.rating ? 'fill-current' : 'text-gray-200'}`}></i>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="font-bold text-[#111111] text-sm capitalize">{review.name}</span>
                                                        <span className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border border-green-200">
                                                            <i className="icon-badge-check text-[10px]"></i> Verified Purchaser
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 flex flex-col items-end">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="text-[#777777] text-[10px] uppercase tracking-widest whitespace-nowrap">
                                                            {review.date}
                                                        </div>
                                                        <button 
                                                            onClick={() => confirmDeleteReview(review.id)}
                                                            className="text-[#777777] hover:text-red-500 transition-colors"
                                                            title="Delete Review"
                                                        >
                                                            <i className="icon-trash text-[11px]"></i>
                                                        </button>
                                                    </div>
                                                    <div className="text-[#A0A0A0] text-[9px] font-bold tracking-widest">
                                                        {(() => {
                                                            const dateStr = review.rawDate || review.date;
                                                            if (!dateStr) return '';
                                                            
                                                            let date = new Date(dateStr);
                                                            
                                                            // Fallback parsing if the string is in DD/MM/YYYY format which may parse as invalid in some browsers
                                                            if (isNaN(date.getTime()) && typeof dateStr === 'string') {
                                                                const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                                                                if (match) {
                                                                    // Convert to MM/DD/YYYY for generic parser
                                                                    date = new Date(`${match[2]}/${match[1]}/${match[3]}`);
                                                                }
                                                            }
                                                            
                                                            if (isNaN(date.getTime())) return '';
                                                            const diff = Math.floor((new Date() - date) / 1000);
                                                            if (diff < 60) return 'JUST NOW';
                                                            const mins = Math.floor(diff / 60);
                                                            if (mins < 60) return `${mins} MIN${mins > 1 ? 'S' : ''} AGO`;
                                                            const hrs = Math.floor(mins / 60);
                                                            if (hrs < 24) return `${hrs} HR${hrs > 1 ? 'S' : ''} AGO`;
                                                            const days = Math.floor(hrs / 24);
                                                            return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-[#444444] leading-relaxed font-light mb-4">{review.comment}</p>
                                            
                                            {review.images && review.images.length > 0 && (
                                                <div className="flex gap-4 overflow-x-auto hide-scrollbar mb-5">
                                                    {review.images.map((img, idx) => img ? (
                                                        <img key={idx} loading="lazy" src={img} onClick={() => setEnlargedImage(img)} className="w-[150px] h-[150px] shrink-0 object-cover rounded-sm border border-[#E0E0E0] cursor-pointer hover:opacity-90 transition-opacity" alt="User Upload" />
                                                    ) : null)}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 pt-4 border-t border-[#F8F8F8]">
                                                <button 
                                                    onClick={() => handleHelpfulClick(review.id)}
                                                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors px-3 py-1.5 rounded-sm ${helpfulClicks[review.id] ? 'bg-gray-100 text-black border border-gray-200' : 'bg-transparent text-[#777777] border border-transparent hover:bg-gray-50 hover:text-black'}`}
                                                >
                                                    <i className={`icon-thumbs-up text-sm ${helpfulClicks[review.id] ? 'fill-current' : ''}`}></i> 
                                                    Helpful {(review.helpful || 0) + (helpfulClicks[review.id] ? 1 : 0)}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Recommendations Grid */}
            {recommendations.length > 0 && (
                <div className="container mx-auto px-6 py-24 border-t border-[#E0E0E0] mt-12 animate-slide-up">
                    <div className="flex justify-between items-end mb-10">
                        <h2 className="text-2xl font-serif font-bold text-[#111111] capitalize">You may also like</h2>
                        <a href="products.html" className="text-xs font-bold text-[#111111] uppercase tracking-widest hover:text-[#777777] transition-colors border-b border-black pb-0.5">View All</a>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {recommendations.map(rec => (
                            <div key={rec.objectId} onClick={() => window.location.href=`product.html?id=${rec.objectId}`} className="group cursor-pointer">
                                <div className="aspect-[3/4] bg-[#F8F8F8] overflow-hidden mb-4 relative">
                                    {rec.objectData.image ? (
                                        <img loading="lazy" src={rec.objectData.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><i className="icon-image text-4xl text-[#E0E0E0]"></i></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#111111] capitalize mb-1">{rec.objectData.name}</h3>
                                    <p className="text-sm text-[#777777]">{rec.objectData.price}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Share Overlay */}
            {showShare && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4 md:p-0">
                    <div className="bg-white w-full max-w-sm p-8 relative animate-slide-up shadow-2xl rounded-sm">
                        <button onClick={() => setShowShare(false)} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        <h3 className="text-2xl font-serif font-bold text-center mb-6 tracking-tight">Share Artifact</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleCopyLink} className="flex items-center justify-center gap-3 p-4 border border-[#E0E0E0] hover:border-black transition-colors text-xs font-bold tracking-widest uppercase">
                                <i className="icon-link"></i> Copy Link
                            </button>
                            <button onClick={handleWhatsAppShare} className="flex items-center justify-center gap-3 p-4 border border-[#E0E0E0] hover:border-black transition-colors text-xs font-bold tracking-widest uppercase">
                                <i className="icon-message-circle"></i> WhatsApp
                            </button>
                            <button onClick={handleInstagramShare} className="flex items-center justify-center gap-3 p-4 border border-[#E0E0E0] hover:border-black transition-colors text-xs font-bold tracking-widest uppercase">
                                <i className="icon-instagram"></i> Instagram
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {shareToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-sm shadow-xl z-[110] animate-slide-up text-[10px] font-bold tracking-widest uppercase flex items-center gap-3">
                    <i className="icon-circle-check text-white"></i> {shareToast}
                </div>
            )}

            {/* Delete Review Confirmation Modal */}
            {reviewToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm p-8 relative animate-slide-up shadow-2xl rounded-sm text-center">
                        <button onClick={() => setReviewToDelete(null)} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x"></i>
                        </button>
                        <i className="icon-triangle-alert text-3xl text-red-500 mb-4 mx-auto"></i>
                        <h3 className="text-xl font-serif font-bold mb-2">Delete Review?</h3>
                        <p className="text-xs text-[#777777] mb-6 font-light leading-relaxed">Are you sure you want to delete this review? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setReviewToDelete(null)}
                                className="flex-1 border border-[#E0E0E0] text-[#111111] py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#F8F8F8] transition-colors rounded-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteReview}
                                className="flex-1 bg-red-600 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enlarged Image Modal */}
            {enlargedImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-fade-in cursor-zoom-out"
                    onClick={() => setEnlargedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10" 
                        onClick={() => setEnlargedImage(null)}
                    >
                        <i className="icon-x text-4xl"></i>
                    </button>
                    <img 
                        loading="lazy"
                        src={enlargedImage} 
                        className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-slide-up" 
                        alt="Enlarged review photo" 
                    />
                </div>
            )}
        </div>
    );
}
