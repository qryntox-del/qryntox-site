function BrandStory() {
    return (
        <section className="bg-white text-black py-24 md:py-32" data-name="brand-story" data-file="components/BrandStory.js">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
                    
                    {/* Left Side: Text Content */}
                    <div className="flex flex-col justify-center animate-slide-up order-2 md:order-1 pr-0 md:pr-8">
                        <span className="text-[10px] font-sans font-bold text-black uppercase tracking-[0.15em] mb-6 block">
                            ABOUT QRYNTOX
                        </span>
                        
                        <h2 className="text-5xl md:text-7xl lg:text-[80px] font-serif font-bold text-black leading-[1.1] mb-8 tracking-tight">
                            An Archive,<br />Not a Store.
                        </h2>
                        
                        <div className="space-y-6 text-sm text-gray-600 font-sans leading-relaxed max-w-md">
                            <p>
                                We do not believe in seasons. We do not participate in trends. QRYNTOX is a curated archive of permanent menswear relics designed for the discerning collector who values permanence over passing fads.
                            </p>
                            <p>
                                Every piece in our collection is an exploration of form, function, and uncompromising material integrity. We source, refine, and present artifacts that are meticulously engineered to withstand the test of time, both physically and aesthetically.
                            </p>
                        </div>
                        
                        <div className="mt-10">
                            <a href="about.html" className="inline-flex items-center gap-3 text-xs font-bold text-black uppercase tracking-widest hover:text-gray-500 transition-colors border-b border-black pb-1 hover:border-gray-500 w-fit">
                                Discover Our Ethos <i className="icon-arrow-right text-sm"></i>
                            </a>
                        </div>
                    </div>

                    {/* Right Side: Visual */}
                    <div className="w-full h-full animate-slide-up stagger-1 order-1 md:order-2">
                        <div className="aspect-[3/4] md:aspect-[4/5] w-full overflow-hidden bg-gray-100 relative group">
                            {/* The blurred/moody portrait image */}
                            <img 
                                
                                
                               
                               
                             src="https://app.trickle.so/storage/app/Untitled design.png" alt="Craftsman working on machinery" className="w-full h-full object-cover grayscale-[0.4] transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0"/>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}