function CartDrawer() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [items, setItems] = React.useState([]);
    const [removingItems, setRemovingItems] = React.useState({});
    const [toastMessage, setToastMessage] = React.useState('');
    const [checkoutStep, setCheckoutStep] = React.useState('cart');
    const [viewMode, setViewMode] = React.useState('full');
    const [singleItemId, setSingleItemId] = React.useState(null);
    const [singleItemSize, setSingleItemSize] = React.useState(null);

    React.useEffect(() => {
        const updateCart = () => {
            setItems(window.CartManager.getItems());
        };
        
        const openCart = (e) => {
            setIsOpen(true);
            setCheckoutStep('cart');
            if (e && e.detail && e.detail.mode === 'single') {
                setViewMode('single');
                setSingleItemId(e.detail.productId);
                setSingleItemSize(e.detail.size || null);
            } else {
                setViewMode('full');
            }
        };

        const showToast = (e) => {
            setToastMessage(e.detail);
            setTimeout(() => setToastMessage(''), 3000);
        };

        window.addEventListener('cartUpdated', updateCart);
        window.addEventListener('openCart', openCart);
        window.addEventListener('showToast', showToast);
        
        updateCart();

        return () => {
            window.removeEventListener('cartUpdated', updateCart);
            window.removeEventListener('openCart', openCart);
            window.removeEventListener('showToast', showToast);
        };
    }, []);

    const updateQuantity = (productId, size, currentQty, delta) => {
        const newQty = currentQty + delta;
        if (newQty <= 0) {
            window.CartManager.removeItem(productId, size);
        } else {
            const currentItems = window.CartManager.getItems();
            const index = currentItems.findIndex(i => i.id === productId && i.size === size);
            if (index !== -1) {
                const item = currentItems[index];
                const maxStock = parseInt(item.maxStock || item.stock || 999, 10);
                if (delta > 0 && newQty > maxStock) {
                    window.dispatchEvent(new CustomEvent('showToast', { detail: 'LIMITED STOCK' }));
                    return;
                }
                item.quantity = newQty;
                localStorage.setItem('qryntox_cart', JSON.stringify(currentItems));
                window.dispatchEvent(new Event('cartUpdated'));
            }
        }
    };

    const handleRemove = (productId, size) => {
        window.CartManager.removeItem(productId, size);
    };

    const displayItems = viewMode === 'single' ? items.filter(i => i.id === singleItemId && (i.size || null) === (singleItemSize || null)) : items;

    const subtotal = displayItems.reduce((sum, item) => {
        const price = parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        return sum + (price * item.quantity);
    }, 0);

    const handleCheckoutClick = (e) => {
        e.preventDefault();
        if (displayItems.length > 0) {
            window.location.href = `product.html?id=${displayItems[0].id}`;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end" data-name="cart-drawer" data-file="components/CartDrawer.js">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            ></div>

            <div className="relative w-full md:w-[450px] bg-white h-full shadow-2xl flex flex-col animate-slide-up md:animate-none md:translate-x-0 transition-transform duration-300 border-l border-[#E0E0E0]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#E0E0E0]">
                    <div className="flex items-center gap-3">
                        {checkoutStep === 'confirm' && (
                            <button onClick={() => setCheckoutStep('cart')} className="text-[#111111] hover:text-[#777777] transition-colors">
                                <i className="icon-arrow-left text-xl"></i>
                            </button>
                        )}
                        <h2 className="text-base font-bold text-[#111111] uppercase tracking-widest">
                            {checkoutStep === 'confirm' ? 'Confirm Order' : viewMode === 'single' ? 'Just Added' : `Your Cart (${items.length})`}
                        </h2>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="text-[#111111] hover:text-[#777777] transition-colors p-2"
                    >
                        <i className="icon-x text-xl"></i>
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {displayItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#777777]">
                            <i className="icon-shopping-bag text-4xl mb-4"></i>
                            <p className="text-xs uppercase tracking-widest font-bold">Your cart is empty</p>
                            <button 
                                onClick={() => {
                                    if (viewMode === 'single') {
                                        setViewMode('full');
                                    } else {
                                        window.location.href = 'products.html';
                                    }
                                }}
                                className="mt-8 border border-[#111111] bg-white px-8 py-3 text-xs font-bold uppercase tracking-widest text-[#111111] hover:bg-[#F8F8F8] transition-colors rounded-sm"
                            >
                                {viewMode === 'single' ? 'View Full Cart' : 'Continue Shopping'}
                            </button>
                        </div>
                    ) : checkoutStep === 'confirm' ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-[#F8F8F8] p-6 border border-[#E0E0E0] rounded-sm">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 border-b border-[#E0E0E0] pb-3">Final Summary</h3>
                                <div className="space-y-3 text-sm">
                                    {displayItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-[#777777]">
                                            <span className="truncate pr-4">{item.quantity}x {item.name}</span>
                                            <span className="text-[#111111] whitespace-nowrap">{item.price}</span>
                                        </div>
                                    ))}
                                    <div className="pt-3 border-t border-[#E0E0E0] mt-3"></div>
                                    <div className="flex justify-between text-[#777777]">
                                        <span>Subtotal</span>
                                        <span className="text-[#111111]">₹{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[#777777]">
                                        <span>Shipping</span>
                                        <span className="text-green-600">FREE</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-[#111111] mt-3">
                                        <span className="font-bold text-[#111111] uppercase tracking-widest text-xs">Total Amount</span>
                                        <span className="text-xl font-bold text-[#111111]">₹{subtotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {displayItems.map((item, idx) => (
                                <div 
                                    key={`${item.id}-${item.size}-${idx}`} 
                                    className={`flex gap-5 transition-all duration-300 ease-out ${removingItems[`${item.id}-${item.size}`] ? 'opacity-0 -translate-x-full h-0 overflow-hidden' : 'opacity-100 translate-x-0'}`}
                                >
                                    {/* Thumbnail */}
                                    <a href={`product.html?id=${item.id}`} className="w-24 h-32 bg-[#F8F8F8] rounded-sm overflow-hidden shrink-0 flex items-center justify-center p-0 border border-[#E0E0E0] hover:opacity-80 transition-opacity">
                                        {item.image ? (
                                            <img loading="lazy" src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <i className="icon-image text-[#E0E0E0] text-3xl"></i>
                                        )}
                                    </a>
                                    
                                    {/* Details */}
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <a href={`product.html?id=${item.id}`} className="text-sm font-bold text-[#111111] leading-tight mb-1 hover:underline decoration-1 underline-offset-2 block">{item.name}</a>
                                                {item.size && <p className="text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-1">SIZE: {item.size}</p>}
                                                <p className="text-sm font-bold text-[#111111] mt-1">{item.price}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-4">
                                            {/* Quantity Selector */}
                                            <div className="flex items-center border border-[#E0E0E0] rounded-sm bg-white">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.size, item.quantity, -1)}
                                                    className="w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-[#F8F8F8] transition-colors"
                                                >
                                                    <i className="icon-minus text-[10px]"></i>
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-[#111111]">{item.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.size, item.quantity, 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-[#111111] hover:bg-[#F8F8F8] transition-colors"
                                                >
                                                    <i className="icon-plus text-[10px]"></i>
                                                </button>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleRemove(item.id, item.size)}
                                                className="text-[10px] font-bold text-[#111111] uppercase tracking-widest hover:underline decoration-1 underline-offset-4 transition-all"
                                            >
                                                REMOVE
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout */}
                {displayItems.length > 0 && (
                    <div className="border-t border-[#E0E0E0] p-8 bg-white">
                        {checkoutStep === 'cart' ? (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold text-[#777777] uppercase tracking-widest">Subtotal</span>
                                    <span className="text-xl font-bold text-[#111111]">₹{subtotal.toFixed(2)}</span>
                                </div>
                                
                                {viewMode === 'single' && items.length > displayItems.length && (
                                    <button 
                                        onClick={() => setViewMode('full')}
                                        className="w-full border border-[#E0E0E0] bg-white text-[#111111] py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#F8F8F8] transition-colors mb-3 rounded-sm flex items-center justify-center gap-2"
                                    >
                                        VIEW FULL CART ({items.length})
                                    </button>
                                )}

                                <button 
                                    onClick={handleCheckoutClick}
                                    className="w-full border border-[#111111] bg-[#111111] text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors mb-6 flex items-center justify-center gap-2 rounded-sm text-center"
                                >
                                    BUY NOW <i className="icon-arrow-right text-sm"></i>
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={handleCheckoutClick}
                                className="w-full border border-[#111111] bg-[#111111] text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors mb-6 flex items-center justify-center gap-2 rounded-sm shadow-md text-center"
                            >
                                CONFIRM ORDER <i className="icon-arrow-right text-sm"></i>
                            </button>
                        )}
                        
                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-6 text-[9px] text-[#111111] font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <i className="icon-lock text-sm"></i> SECURE CHECKOUT
                            </div>
                            <div className="flex items-center gap-2">
                                <i className="icon-truck text-sm"></i> FREE SHIPPING > ₹5000
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}