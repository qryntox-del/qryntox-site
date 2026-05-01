function Header() {
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');
    const [cartCount, setCartCount] = React.useState(0);
    const [showVault, setShowVault] = React.useState(false);
    const [isAuthorized, setIsAuthorized] = React.useState(false);
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState([]);
    const searchInputRef = React.useRef(null);
    const mobileSearchInputRef = React.useRef(null);
    const [user, setUser] = React.useState(null);
    const [showLoginModal, setShowLoginModal] = React.useState(false);
    const [isAuthLoading, setIsAuthLoading] = React.useState(true);
    const [loginStep, setLoginStep] = React.useState('phone');
    const [loginPhone, setLoginPhone] = React.useState('');
    const [loginOtp, setLoginOtp] = React.useState('');
    const [loginName, setLoginName] = React.useState('');
    const [globalToast, setGlobalToast] = React.useState('');

    React.useEffect(() => {
        const handleGlobalToast = (e) => {
            setGlobalToast(e.detail);
            setTimeout(() => setGlobalToast(''), 3000);
        };
        window.addEventListener('showToast', handleGlobalToast);
        return () => window.removeEventListener('showToast', handleGlobalToast);
    }, []);

    React.useEffect(() => {
        const checkAuth = () => {
            if (window.AuthManager) {
                const newUser = window.AuthManager.getUser();
                setUser(prev => JSON.stringify(prev) !== JSON.stringify(newUser) ? newUser : prev);
            }
            setIsAuthLoading(prev => prev !== false ? false : prev);
        };
        checkAuth();

        const handleRequestLogin = () => {
            if (!localStorage.getItem('userPhone') && !user) {
                setShowLoginModal(true);
            }
        };

        window.addEventListener('authUpdated', checkAuth);
        window.addEventListener('requestLogin', handleRequestLogin);
        return () => {
            window.removeEventListener('authUpdated', checkAuth);
            window.removeEventListener('requestLogin', handleRequestLogin);
        };
    }, []);

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        if (loginStep === 'phone') {
            if (loginPhone.length >= 10) {
                // Simulate sending OTP via SMS Gateway
                console.log(`Simulating SMS to ${loginPhone} via Gateway...`);
                setLoginStep('otp');
            }
        } else if (loginStep === 'otp') {
            if (loginOtp.length >= 4) {
                // Immediate Storage: Hard-key that Android cannot ignore
                localStorage.setItem('userPhone', loginPhone);
                
                // If using Firebase in the future:
                // firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                
                if (window.AuthManager) {
                    window.AuthManager.login(loginPhone, loginName || 'Guest');
                }
                
                setShowLoginModal(false);
                setLoginStep('phone');
                setLoginPhone('');
                setLoginOtp('');
                setLoginName('');
                window.location.href = 'profile.html';
            }
        }
    };

    React.useEffect(() => {
        if (searchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSearchOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchOpen]);

    React.useEffect(() => {
        try {
            if (searchValue.trim() === '') {
                setSearchResults([]);
                return;
            }
            const query = searchValue.toLowerCase();
            let localProducts = [];
            try {
                localProducts = JSON.parse(localStorage.getItem('qryntox_local_products') || '[]');
            } catch(e) {}
            
            const allProducts = localProducts;
            
            const results = allProducts.filter(p => {
                try {
                    const data = p.objectData || p;
                    const name = data.name || '';
                    const category = data.category || '';
                    const description = data.description || '';
                    
                    return name.toLowerCase().includes(query) || 
                           category.toLowerCase().includes(query) ||
                           description.toLowerCase().includes(query);
                } catch (e) {
                    return false;
                }
            });
            
            setSearchResults(results);
        } catch (error) {
            console.error('Search filtering error:', error);
            setSearchResults([]);
        }
    }, [searchValue]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchValue(val);
        
        if (val.toLowerCase() === 'open sam') {
            window.location.href = 'admin.html';
            return;
        }
        
        // Dispatch event so ProductsPage can filter live without refreshing
        window.dispatchEvent(new CustomEvent('liveSearch', { detail: val }));
    };

    const handleSearchCommand = (e) => {
        if (e.key === 'Enter') {
            if (searchValue.trim()) {
                window.location.href = `products.html?search=${encodeURIComponent(searchValue.trim())}`;
            }
        }
    };

    React.useEffect(() => {
        const checkUser = () => {
            const authorized = localStorage.getItem('qryntox_isAuthorized') === 'true';
            setIsAuthorized(prev => prev !== authorized ? authorized : prev);
        };
        checkUser();
        window.addEventListener('storage', checkUser);
        window.addEventListener('vaultAuthChanged', checkUser);
        return () => {
            window.removeEventListener('storage', checkUser);
            window.removeEventListener('vaultAuthChanged', checkUser);
        };
    }, []);

    React.useEffect(() => {
        const updateCount = () => {
            if (window.CartManager) {
                const items = window.CartManager.getItems();
                const newCount = items.reduce((sum, item) => sum + item.quantity, 0);
                setCartCount(prev => prev !== newCount ? newCount : prev);
            }
        };
        window.addEventListener('cartUpdated', updateCount);
        updateCount();
        return () => window.removeEventListener('cartUpdated', updateCount);
    }, []);

    React.useEffect(() => {
        const handleScroll = () => setIsScrolled(prev => {
            const current = window.scrollY > 20;
            return prev !== current ? current : prev;
        });
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${mobileMenuOpen ? 'bg-white' : ''}`} data-name="header" data-file="components/Header.js">
            {/* Top Bar */}
            <div className="bg-black text-white text-[9px] md:text-[10px] text-center py-2 tracking-[0.3em] md:tracking-[0.4em] uppercase font-sans">
                THRISSUR / KERALA / COLLECTION
            </div>

            {/* Main Navigation */}
            <div className={`transition-all duration-300 ${isScrolled || mobileMenuOpen ? 'bg-white shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                    
                    {/* Left: Primary Nav (Desktop) */}
                    <nav className="hidden md:flex flex-1 items-center gap-8 text-black">
                        <a href="products.html" className="font-sans font-bold text-[11px] tracking-[0.15em] uppercase hover:opacity-60 transition-opacity">SHOP</a>
                        <a href="about.html" className="font-sans font-bold text-[11px] tracking-[0.15em] uppercase hover:opacity-60 transition-opacity">ABOUT</a>
                        <a href="terms.html" className="font-sans font-bold text-[11px] tracking-[0.15em] uppercase hover:opacity-60 transition-opacity">TERMS & CONDITIONS</a>
                    </nav>
                    <div className="md:hidden flex-1"></div>

                    {/* Center: Logo */}
                    <div className="flex-shrink-0 flex items-center justify-center mx-2" style={{ textAlign: 'center' }}>
                        <a href="index.html" className="text-xl md:text-3xl font-serif font-bold tracking-[0.15em] uppercase hover:opacity-60 transition-opacity text-black whitespace-nowrap inline-block">
                            QRYNTOX
                        </a>
                    </div>

                    {/* Right: Utility Nav & Mobile Toggle */}
                    <div className="flex flex-1 items-center justify-end gap-3 md:gap-6 text-black">
                        <button className="hidden md:block transition-opacity group" aria-label="Search" onClick={() => setSearchOpen(true)}>
                            <i className="icon-search text-lg md:text-xl text-[#000000] group-hover:opacity-70 transition-opacity duration-300"></i>
                        </button>

                        <div className="relative group/profile">
                            <button 
                                className="transition-opacity flex items-center gap-1 group" 
                                aria-label="Profile"
                                onClick={() => {
                                    if (!user) setShowLoginModal(true);
                                }}
                            >
                                <i className="icon-user text-lg md:text-xl text-[#000000] group-hover:opacity-70 transition-opacity duration-300"></i>
                            </button>
                            
                            {user && (
                                <div className="absolute right-0 top-full mt-4 w-48 bg-white border border-gray-200 shadow-xl opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-300 z-50 rounded-sm flex flex-col">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{user.name || 'User'}</p>
                                    </div>
                                    <a href="profile.html" className="px-4 py-3 text-xs font-bold text-black uppercase tracking-widest hover:bg-gray-50 transition-colors">My Profile</a>
                                    <button 
                                        onClick={() => { if(window.CartManager) window.CartManager.logout(); }} 
                                        className="px-4 py-3 text-xs font-bold text-red-600 uppercase tracking-widest hover:bg-red-50 transition-colors text-left border-t border-gray-100"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <button onClick={() => window.dispatchEvent(new CustomEvent('openCart', { detail: { mode: 'full' } }))} className="transition-opacity relative group" aria-label="Cart">
                            <i className="icon-shopping-bag text-lg md:text-xl text-[#000000] group-hover:opacity-70 transition-opacity duration-300"></i>
                            {cartCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center bg-black text-white">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                        
                        {/* Mobile Hamburger */}
                        <button 
                            className="md:hidden hover:opacity-60 transition-opacity flex items-center"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            <i className={`text-xl md:text-2xl ${mobileMenuOpen ? 'icon-x' : 'icon-menu'}`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Nav Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 animate-slide-down shadow-xl text-black">
                    <div className="flex flex-col px-6 py-8 gap-8 items-center">
                        {user && (
                            <div className="flex flex-col items-center gap-6 w-full pb-6 border-b border-gray-100">
                                <a href="profile.html" className="font-sans text-sm font-bold uppercase tracking-[0.15em] text-black">MY PROFILE</a>
                                <button onClick={() => { if(window.CartManager) window.CartManager.logout(); }} className="font-sans text-sm font-bold uppercase tracking-[0.15em] text-red-600">LOGOUT</button>
                            </div>
                        )}
                        <a href="products.html" className="font-sans text-sm font-bold uppercase tracking-[0.15em]">SHOP</a>
                        <a href="about.html" className="font-sans text-sm font-bold uppercase tracking-[0.15em]">ABOUT</a>
                        <a href="terms.html" className="font-sans text-sm font-bold uppercase tracking-[0.15em]">TERMS & CONDITIONS</a>
                        <div className="h-px w-full bg-gray-100 my-2"></div>
                        <div className="flex flex-col gap-6 pt-2 w-full">
                            <button onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }} className="flex items-center justify-center gap-4 text-sm font-bold uppercase tracking-[0.15em] w-full py-4 border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-black">
                                <i className="icon-search"></i> SEARCH ARCHIVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <VaultModal isOpen={showVault} onClose={() => setShowVault(false)} />
            
            {isVerifying && (
                <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white text-black animate-fade-in">
                    <i className="icon-loader animate-spin text-3xl mb-6 text-gray-300"></i>
                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500">Verifying Credentials...</p>
                </div>
            )}

            {/* Global Search Overlay */}
            {/* Login / OTP Modal */}
            {(() => {
                const isAuth = !!localStorage.getItem('userPhone') || !!user;
                if (isAuthLoading || isAuth || !showLoginModal) return null;
                
                return (
                <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4 w-full h-[100dvh]">
                    <div className="bg-white w-full max-w-sm p-8 relative animate-slide-up shadow-2xl rounded-sm">
                        <button onClick={() => { setShowLoginModal(false); setLoginStep('phone'); }} className="absolute top-4 right-4 text-[#777777] hover:text-black transition-colors">
                            <i className="icon-x text-xl"></i>
                        </button>
                        <h3 className="text-2xl font-serif font-bold text-center mb-2 tracking-tight">Access Protocol</h3>
                        <p className="text-xs text-[#777777] text-center mb-6 font-sans uppercase tracking-widest">
                            {loginStep === 'phone' ? 'Enter credentials to continue' : 'Verify Identity'}
                        </p>
                        
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            {loginStep === 'phone' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">Name (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={loginName}
                                            onChange={e => setLoginName(e.target.value)}
                                            placeholder="Your Name"
                                            className="w-full bg-white border border-[#E0E0E0] px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">Mobile Number</label>
                                        <input 
                                            required
                                            type="tel" 
                                            value={loginPhone}
                                            onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                                            placeholder="10-digit number"
                                            maxLength="10"
                                            className="w-full bg-white border border-[#E0E0E0] px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-black text-white font-bold text-xs uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors mt-4 rounded-sm">
                                        Request OTP
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#777777] uppercase tracking-widest mb-2">ENTER ANY 4 DIGIT</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={loginOtp}
                                            onChange={e => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Any 4 digits (Simulation)"
                                            maxLength="6"
                                            autoFocus
                                            className="w-full text-center tracking-[1em] font-mono bg-white border border-[#E0E0E0] px-4 py-3 text-lg focus:border-black focus:outline-none transition-colors rounded-sm"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-black text-white font-bold text-xs uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors mt-4 rounded-sm">
                                        Verify & Login
                                    </button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
                );
            })()}

            {/* Global Toast */}
            {globalToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-sm shadow-2xl z-[1100] animate-slide-down text-[10px] font-bold tracking-widest uppercase flex items-center gap-3">
                    <i className="icon-info text-white text-sm"></i> {globalToast}
                </div>
            )}

            {/* Global Search Overlay */}
            {searchOpen && (
                <div className="fixed inset-0 z-[1000] bg-white/95 backdrop-blur-md animate-fade-in flex flex-col overflow-hidden text-black">
                    <div className="container mx-auto px-4 md:px-8 py-6 md:py-8 flex items-center justify-between border-b border-[#333333]">
                        <i className="icon-search text-2xl text-[#000000] hidden md:block"></i>
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            className="w-full bg-transparent text-2xl md:text-5xl font-serif px-2 md:px-6 outline-none text-[#000000] placeholder-[#666666]"
                            placeholder="Search artifacts..."
                            value={searchValue}
                            onChange={handleSearchChange}
                        />
                        <div className="flex items-center gap-4">
                            <span className="hidden md:inline text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-200 px-2 py-1 rounded">ESC</span>
                            <button onClick={() => setSearchOpen(false)} className="text-black hover:opacity-60 transition-opacity p-2">
                                <i className="icon-x text-3xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="container mx-auto px-6 py-8 flex-1 overflow-y-auto">
                        {searchValue.trim() !== '' ? (
                            searchResults.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
                                    {searchResults.map(res => (
                                        <a key={res.objectId} href={`product.html?id=${res.objectId}`} className="group block flex flex-col h-full bg-white border border-transparent hover:border-gray-200 transition-colors p-2 rounded-sm">
                                            <div className="aspect-[3/4] bg-gray-100 mb-4 overflow-hidden relative">
                                                {res.objectData.image ? (
                                                    <img src={res.objectData.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><i className="icon-image text-gray-300 text-3xl"></i></div>
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <h3 className="text-xs md:text-sm font-bold text-black uppercase tracking-wide line-clamp-2 leading-snug">{res.objectData.name}</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 mb-2">{res.objectData.category || 'Product'}</p>
                                                <p className="text-xs font-bold text-black mt-auto">{res.objectData.price}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32">
                                    <i className="icon-search text-5xl text-gray-200 mb-4"></i>
                                    <p className="font-serif text-2xl text-gray-500 italic">No artifacts found matching "{searchValue}"</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-32">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type to search for products, categories, or keywords</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
        </header>
    );
}
