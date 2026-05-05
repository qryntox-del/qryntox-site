const FavoriteIcon = ({ product }) => {
    const [isFav, setIsFav] = React.useState(false);
    const [animating, setAnimating] = React.useState(false);

    const checkStatus = React.useCallback(() => {
        const phone = window.AuthManager?.getUser()?.phone || localStorage.getItem('userPhone');
        if (!phone) {
            setIsFav(false);
            return;
        }
        const favs = JSON.parse(localStorage.getItem(`favorites_map_${phone}`) || '{}');
        setIsFav(!!favs[product.objectId]);
    }, [product.objectId]);

    React.useEffect(() => {
        checkStatus();
        window.addEventListener('favoritesUpdated', checkStatus);
        window.addEventListener('userLogin', checkStatus);
        window.addEventListener('userLogout', checkStatus);
        return () => {
            window.removeEventListener('favoritesUpdated', checkStatus);
            window.removeEventListener('userLogin', checkStatus);
            window.removeEventListener('userLogout', checkStatus);
        };
    }, [checkStatus]);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const phone = window.AuthManager?.getUser()?.phone || localStorage.getItem('userPhone');
        if (!phone) {
            window.dispatchEvent(new Event('requestLogin'));
            return;
        }

        const favs = JSON.parse(localStorage.getItem(`favorites_map_${phone}`) || '{}');
        
        if (isFav || favs[product.objectId]) {
            // Remove (Un-favorite)
            setIsFav(false);
            const dbObjectId = favs[product.objectId];
            delete favs[product.objectId];
            localStorage.setItem(`favorites_map_${phone}`, JSON.stringify(favs));
            window.dispatchEvent(new Event('favoritesUpdated'));
            
            if (window.trickleDeleteObject && dbObjectId && dbObjectId !== 'pending') {
                try {
                    await window.trickleDeleteObject(`favorites:${phone}`, dbObjectId);
                } catch(err) { console.warn(err); }
            }
        } else {
            // Add (Favorite)
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
            audio.play().catch(()=>{});
            
            setAnimating(true);
            setIsFav(true);
            setTimeout(() => setAnimating(false), 800);
            
            // Optimistic Update
            favs[product.objectId] = 'pending';
            localStorage.setItem(`favorites_map_${phone}`, JSON.stringify(favs));
            window.dispatchEvent(new Event('favoritesUpdated'));

            if (window.trickleCreateObject) {
                try {
                    const res = await window.trickleCreateObject(`favorites:${phone}`, { 
                        productId: product.objectId, 
                        productData: product.objectData 
                    });
                    const currentFavs = JSON.parse(localStorage.getItem(`favorites_map_${phone}`) || '{}');
                    if (currentFavs[product.objectId]) {
                        currentFavs[product.objectId] = res.objectId;
                        localStorage.setItem(`favorites_map_${phone}`, JSON.stringify(currentFavs));
                    }
                } catch(err) { console.warn(err); }
            }
        }
    };

    return (
        <React.Fragment>
            <button 
                onClick={handleClick}
                className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 hover:bg-white"
            >
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill={isFav ? "#ef4444" : "none"} 
                    stroke={isFav ? "#ef4444" : "currentColor"} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`w-4 h-4 transition-colors duration-300 ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-gray-900'}`}
                >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
            </button>
            {animating && (
                <div className="absolute top-1/2 left-1/2 z-40 pointer-events-none animate-center-blast text-red-500">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor" 
                        stroke="none" 
                        className="w-16 h-16 drop-shadow-2xl"
                    >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                </div>
            )}
        </React.Fragment>
    );
};

function FeaturedProducts() {
    const [products, setProducts] = React.useState([]);

    React.useEffect(() => {
        const syncFavorites = async () => {
            const phone = window.AuthManager?.getUser()?.phone || localStorage.getItem('userPhone');
            if (!phone) return;
            try {
                const res = await window.trickleListObjects(`favorites:${phone}`, 100, true);
                if (res && res.items) {
                    const map = {};
                    res.items.forEach(item => {
                        if (item.objectData?.productId) map[item.objectData.productId] = item.objectId;
                    });
                    localStorage.setItem(`favorites_map_${phone}`, JSON.stringify(map));
                    window.dispatchEvent(new Event('favoritesUpdated'));
                }
            } catch(e) {}
        };
        syncFavorites();
        window.addEventListener('userLogin', syncFavorites);
        return () => window.removeEventListener('userLogin', syncFavorites);
    }, []);
    const [loading, setLoading] = React.useState(true);

    const loadProducts = async () => {
        try {
            setLoading(prev => products.length === 0 ? true : prev);
            
            const fetchWithRetry = async (retries = 2, timeout = 8000) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        if (!window.trickleListObjects) return [];
                        const res = await Promise.race([
                            window.trickleListObjects('products', 100, true),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
                        ]);
                        return res?.items || [];
                    } catch (err) {
                        if (i === retries - 1) {
                            console.warn('FeaturedProducts fetch gracefully failed:', err.message || err);
                            return [];
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                return [];
            };

            let finalProducts = await fetchWithRetry();
            
            if (finalProducts.length === 0) {
                const cached = localStorage.getItem('qryntox_local_products');
                if (cached) {
                    try { finalProducts = JSON.parse(cached) || []; } catch(e) {}
                }
            }

            const safeProducts = Array.isArray(finalProducts) ? finalProducts : [];
            safeProducts.sort((a, b) => {
                const aName = (a?.objectData?.name || '').toLowerCase();
                const bName = (b?.objectData?.name || '').toLowerCase();
                if (aName.includes('sam') && !bName.includes('sam')) return -1;
                if (!aName.includes('sam') && bName.includes('sam')) return 1;
                return 0;
            });

            setProducts(safeProducts.filter(p => p?.objectData && p.objectData.status !== 'Draft').slice(0, 4));
        } catch(e) {
            // Silently fallback without logging as an error
            console.warn('FeaturedProducts load fallback triggered by network timeout/error.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadProducts();
        window.addEventListener('productsUpdated', loadProducts);
        return () => {
            window.removeEventListener('productsUpdated', loadProducts);
        };
    }, []);

    return (
        <section className="py-16 md:py-24 bg-white px-5 md:px-0" data-name="featured-products" data-file="components/FeaturedProducts.js">
            <div className="container mx-auto max-w-7xl">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-black uppercase tracking-widest mb-3">The Collection</h2>
                        <p className="text-sm text-gray-500 font-sans tracking-wide">Curated artifacts for the modern era.</p>
                    </div>
                    <a href="products.html" className="hidden md:inline-flex items-center gap-2 text-xs font-bold text-black uppercase tracking-widest hover:text-gray-500 transition-colors border-b border-black hover:border-gray-500 pb-1">
                        View Archive <i className="icon-arrow-right"></i>
                    </a>
                </div>
                
                {loading || products.length === 0 ? (
                    <div className="flex justify-center py-24"><i className="icon-loader animate-spin text-4xl text-gray-300"></i></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[15px] md:gap-8">
                        {products.map(product => {
                            const data = product.objectData;
                            return (
                                <div key={product.objectId || product.id || data.name} className="group cursor-pointer flex flex-col h-full bg-white" onClick={() => window.location.href = `product.html?id=${product.objectId || product.id}`}>
                                    <div className="relative aspect-[3/4] overflow-hidden bg-[#F2F2F2] mb-4 flex items-center justify-center">
                                        <FavoriteIcon product={product} />
                                        {data.image ? (
                                            <img loading="lazy" src={data.image} alt={data.name} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                                        ) : (
                                            <i className="icon-image text-4xl text-gray-300"></i>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
                                        
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 p-2 md:p-3 flex flex-col gap-1.5 transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {(data.inStock === false || parseInt(data.stock, 10) === 0) ? (
                                                <button disabled className="w-full bg-gray-200/95 backdrop-blur-sm text-gray-500 font-bold text-[10px] tracking-widest py-2 md:py-2.5 uppercase cursor-not-allowed">
                                                    OUT OF STOCK
                                                </button>
                                            ) : (
                                                <React.Fragment>
                                                    {data.showAddToCart !== false && (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation();
                                                                window.location.href = `product.html?id=${product.objectId}`;
                                                            }} 
                                                            className="w-full text-[#4B3D21] font-bold text-[10px] tracking-widest py-2 md:py-2.5 uppercase font-sans border border-[#D4AF37] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_12px_rgba(242,208,107,0.6)]"
                                                            style={{ background: 'linear-gradient(45deg, #F2D06B 0%, #F2D06B 40%, rgba(255, 255, 255, 0.4) 50%, #F2D06B 60%, #F2D06B 100%)' }}
                                                        >
                                                            BUY NOW
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation();
                                                            const existingCart = window.CartManager.getItems();
                                                            const existingItem = existingCart.find(i => i.id === product.objectId && !i.size);
                                                            if (existingItem && existingItem.quantity >= (parseInt(data.stock, 10) || 0)) {
                                                                window.dispatchEvent(new CustomEvent('showToast', { detail: 'LIMITED STOCK' }));
                                                                return;
                                                            }
                                                            window.CartManager.addItem(product, 1, null); 
                                                            window.dispatchEvent(new CustomEvent('openCart', { detail: { mode: 'full' } }));
                                                            window.dispatchEvent(new CustomEvent('showToast', { detail: 'PRODUCT ADDED TO CART' }));
                                                        }} 
                                                        className="w-full bg-[#FAFAFA]/95 backdrop-blur-sm text-[#111111] font-bold text-[10px] tracking-widest py-2 md:py-2.5 uppercase hover:bg-white transition-colors border border-transparent hover:border-[#E0E0E0]"
                                                    >
                                                        ADD TO CART
                                                    </button>
                                                </React.Fragment>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-start px-1 pb-2 mt-2 flex-1">
                                        <div className="flex flex-col text-left pr-2 md:pr-4 overflow-hidden">
                                            <h3 className="font-serif text-sm font-bold text-black mb-1 capitalize tracking-wide truncate">{data.name}</h3>
                                            <p className="font-sans text-[10px] font-medium text-gray-500 uppercase tracking-widest truncate">{data.category || 'Product'}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="text-xs font-bold text-black whitespace-nowrap">{data.price}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className="mt-12 text-center md:hidden">
                    <a href="products.html" className="inline-flex items-center gap-2 text-xs font-bold text-black uppercase tracking-widest hover:text-gray-500 transition-colors border-b border-black hover:border-gray-500 pb-1">
                        View Archive <i className="icon-arrow-right"></i>
                    </a>
                </div>
            </div>
        </section>
    );
}