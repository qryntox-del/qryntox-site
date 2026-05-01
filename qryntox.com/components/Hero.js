function Hero() {
    const [currentImage, setCurrentImage] = React.useState(0);
    
    const images = [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=2000",
        "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=2000",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000"
    ];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % images.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [images.length]);

    return (
        <section 
            id="home"
            className="relative min-h-screen w-full flex items-center justify-center bg-white overflow-hidden pt-20" 
            data-name="hero" 
            data-file="components/Hero.js"
        >
            {/* Background Slider */}
            <div className="absolute inset-0 z-0">
                {images.map((img, idx) => (
                    <div 
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${idx === currentImage ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <img 
                            src={img} 
                            alt={`Archive Slide ${idx + 1}`}
                            className="w-full h-full object-cover grayscale opacity-30" 
                        />
                    </div>
                ))}
            </div>

            {/* Mobile Dark Overlay (Scrim) */}
            <div className="absolute inset-0 z-10 bg-black/40 md:bg-transparent pointer-events-none"></div>

            {/* Content Container */}
            <div className="relative z-20 px-[20px] w-full max-w-5xl mx-auto flex flex-col items-center justify-center mt-12 md:mt-24 text-center">
                <h1 className="text-[clamp(2rem,8vw,3.5rem)] md:text-[clamp(4rem,12vw,120px)] font-serif font-bold text-white md:text-black leading-[1.1] mb-6 opacity-0 animate-slide-up stagger-1 tracking-tight w-full text-center flex flex-col items-center justify-center">
                    The Archive
                </h1>
                
                <p className="text-xs md:text-sm text-white md:text-black tracking-[0.15em] font-sans font-bold mb-10 md:mb-12 max-w-2xl mx-auto opacity-0 animate-slide-up stagger-2 uppercase leading-relaxed drop-shadow-md md:drop-shadow-none w-full text-center flex flex-col items-center justify-center">
                    CURATED MENSWEAR RELICS FOR THE DISCERNING COLLECTOR.
                </p>
                
                <div className="opacity-0 animate-slide-up stagger-3 mt-6 mb-4 w-full flex justify-center items-center flex-col">
                    <button 
                        onClick={() => window.location.href = 'products.html'} 
                        className="bg-black text-white px-6 py-4 md:px-10 md:py-5 font-sans font-bold text-[10px] md:text-xs uppercase tracking-[0.15em] hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 md:gap-3 shadow-2xl rounded-none w-auto min-w-[200px] whitespace-nowrap mx-auto"
                    >
                        ENTER ARCHIVE <i className="icon-arrow-right"></i>
                    </button>
                </div>
            </div>
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-white md:text-black flex flex-col items-center opacity-0 animate-fade-in" style={{ animationDelay: '1s' }}>
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] font-sans mb-2">Scroll</span>
                <div className="w-px h-12 bg-white/40 md:bg-black/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white md:bg-black animate-slide-down" style={{ animationIterationCount: 'infinite', animationDuration: '2s' }}></div>
                </div>
            </div>
        </section>
    );
}