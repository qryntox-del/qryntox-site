function Footer() {
    const [email, setEmail] = React.useState('');
    const [status, setStatus] = React.useState('');

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (email) {
            setStatus('Subscribed successfully!');
            setEmail('');
            setTimeout(() => setStatus(''), 3000);
        }
    };

    return (
        <footer className="bg-white border-t border-gray-200 pt-16 pb-8 text-black" data-name="footer" data-file="components/Footer.js">
            <div className="container mx-auto px-6 max-w-7xl">
                
                {/* Newsletter Section */}
                <div className="border-b border-gray-200 pb-16 mb-16 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="md:w-1/2 text-center md:text-left">
                        <h3 className="font-serif text-2xl font-bold uppercase tracking-widest mb-2">Join the Protocol</h3>
                        <p className="font-sans text-sm text-gray-500">Subscribe for early access to new archival releases and exclusive collections.</p>
                    </div>
                    <div className="md:w-1/2 w-full max-w-md">
                        <form onSubmit={handleSubscribe} className="flex gap-2">
                            <input 
                                type="email" 
                                required
                                placeholder="Enter your email address" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                            />
                            <button type="submit" className="bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors whitespace-nowrap">
                                Subscribe
                            </button>
                        </form>
                        {status && <p className="text-green-600 text-xs font-bold uppercase tracking-widest mt-3 animate-fade-in"><i className="icon-circle-check mr-1"></i>{status}</p>}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-16 mb-24">
                    {/* Left: Brand */}
                    <div className="lg:w-1/3">
                        <h2 className="text-3xl font-serif font-bold tracking-widest uppercase mb-6">QRYNTOX</h2>
                        <p className="font-sans text-sm text-gray-500 leading-relaxed max-w-sm mb-8">
                            Curating permanent collections of minimalist design, architectural influence, and uncompromising quality for the modern collector.
                        </p>

                    </div>

                    {/* Right: Links */}
                    <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-3 gap-12">
                        <div>
                            <h3 className="font-serif text-sm font-bold uppercase tracking-widest mb-6">ARCHIVES</h3>
                            <ul className="space-y-4 font-sans text-sm text-gray-500">
                                <li><a href="products.html" className="hover:text-black transition-colors">All Products</a></li>
                                <li><a href="products.html?category=Accessories" className="hover:text-black transition-colors">Accessories</a></li>
                                <li><a href="products.html?category=Tech" className="hover:text-black transition-colors">Tech</a></li>
                                <li><a href="products.html?category=Lifestyle" className="hover:text-black transition-colors">Lifestyle</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-serif text-sm font-bold uppercase tracking-widest mb-6">PROTOCOL</h3>
                            <ul className="space-y-4 font-sans text-sm text-gray-500">
                                <li><a href="#" className="hover:text-black transition-colors">Shipping & Returns</a></li>
                                <li><a href="#" className="hover:text-black transition-colors">Track Order</a></li>
                                <li><a href="#" className="hover:text-black transition-colors">FAQ</a></li>
                                <li><a href="#" className="hover:text-black transition-colors">Care Guide</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-serif text-sm font-bold uppercase tracking-widest mb-6">COMPANY</h3>
                            <ul className="space-y-4 font-sans text-sm text-gray-500">
                                <li><a href="terms.html" className="hover:text-black transition-colors">Terms & Conditions</a></li>
                                <li><a href="index.html#ethics" className="hover:text-black transition-colors">Circular Ethics</a></li>
                                <li><a href="#" className="hover:text-black transition-colors">Contact</a></li>
                                <li><a href="#" className="hover:text-black transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Copyright Bar */}
                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 font-sans text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <p>© 2026 QRYNTOX — URBAN ARCHIVE V4.0</p>
                    <div className="flex gap-6 text-right">
                        <span>THRISSUR, INDIA | WORLDWIDE DISPATCH</span>
                    </div>
                </div>
            </div>

            {/* Floating Social Icons */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
                <button 
                    onClick={(e) => { e.preventDefault(); window.open('https://api.whatsapp.com/send?phone=918590665753', '_blank'); }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: '#25D366', color: 'white' }}
                    title="WhatsApp"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </button>
                <button 
                    onClick={(e) => { e.preventDefault(); window.open('https://www.instagram.com/qryntox', '_blank'); }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 text-white"
                    style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                    title="Instagram"
                >
                    <i className="icon-instagram text-xl"></i>
                </button>
            </div>
        </footer>
    );
}
