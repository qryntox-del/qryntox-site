function CircularEthics() {
    return (
        <section id="ethics" className="py-24 md:py-32 bg-white text-black px-6 border-t border-gray-100" data-name="circular-ethics" data-file="components/CircularEthics.js">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-16 md:mb-24 animate-slide-up">
                    <h2 className="text-5xl md:text-7xl lg:text-[80px] font-serif font-bold mb-8 uppercase tracking-wide text-black leading-[1.1]">
                        Circular Ethics
                    </h2>
                    <p className="text-xs md:text-sm font-sans font-bold tracking-[0.15em] uppercase max-w-3xl mx-auto text-gray-600 leading-relaxed">
                        THE FASHION INDUSTRY IS ONE OF THE MOST POLLUTING ON EARTH. WE'RE BUILDING AN ALTERNATIVE.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up stagger-1">
                    {/* Card 1 */}
                    <div className="flex flex-col items-center text-center bg-white border border-gray-200 p-10 md:p-12 hover:border-black transition-colors duration-500">
                        <div className="mb-8">
                            <i className="icon-circle text-4xl text-black"></i>
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-4 uppercase text-black tracking-[0.15em]">CIRCULAR ETHICS</h3>
                        <p className="text-sm font-sans text-gray-600 leading-relaxed">
                            We design for longevity, ensuring every piece can be repaired, repurposed, or recycled at the end of its lifecycle.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="flex flex-col items-center text-center bg-white border border-gray-200 p-10 md:p-12 hover:border-black transition-colors duration-500">
                        <div className="mb-8 rotate-45">
                            <i className="icon-square text-4xl text-black -rotate-45"></i>
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-4 uppercase text-black tracking-[0.15em]">MATERIAL TRUTH</h3>
                        <p className="text-sm font-sans text-gray-600 leading-relaxed">
                            Uncompromising transparency in our supply chain. We source organic, upcycled, and ethically produced textiles.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="flex flex-col items-center text-center bg-white border border-gray-200 p-10 md:p-12 hover:border-black transition-colors duration-500">
                        <div className="mb-8">
                            <i className="icon-triangle text-4xl text-black"></i>
                        </div>
                        <h3 className="text-xl font-serif font-bold mb-4 uppercase text-black tracking-[0.15em]">SLOW FASHION</h3>
                        <p className="text-sm font-sans text-gray-600 leading-relaxed">
                            Rejecting seasonal micro-trends. We release permanent collections designed to remain relevant for decades.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}