function ArchiveAbout() {
    return (
        <section className="py-24 md:py-32 bg-white text-black border-b border-gray-100" data-name="archive-about" data-file="components/ArchiveAbout.js">
            <div className="container mx-auto px-6 max-w-6xl">
                {/* Impact Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-16 gap-x-8 text-center animate-slide-up">
                    <div className="flex flex-col items-center">
                        <p className="text-6xl md:text-[80px] lg:text-[100px] leading-[1.1] font-serif font-bold text-black mb-4 tracking-tight">2019</p>
                        <p className="text-xs font-sans text-gray-500 uppercase tracking-[0.15em] font-bold">FOUNDED</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-6xl md:text-[80px] lg:text-[100px] leading-[1.1] font-serif font-bold text-black mb-4 tracking-tight">300+</p>
                        <p className="text-xs font-sans text-gray-500 uppercase tracking-[0.15em] font-bold">ARCHIVAL PIECES</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-6xl md:text-[80px] lg:text-[100px] leading-[1.1] font-serif font-bold text-black mb-4 tracking-tight">100%</p>
                        <p className="text-xs font-sans text-gray-500 uppercase tracking-[0.15em] font-bold">AUTHENTICATED</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-6xl md:text-[80px] lg:text-[100px] leading-[1.1] font-serif font-bold text-black mb-4 tracking-tight">KL</p>
                        <p className="text-xs font-sans text-gray-500 uppercase tracking-[0.15em] font-bold">ORIGIN NODE</p>
                    </div>
                </div>
            </div>
        </section>
    );
}