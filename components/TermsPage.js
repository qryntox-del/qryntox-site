function TermsPage() {
    return (
        <div className="container mx-auto px-6 py-12 md:py-24 max-w-4xl" data-name="terms-page" data-file="components/TermsPage.js">
            
            <div className="text-center mb-16 md:mb-24 animate-slide-up">
                <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 tracking-tight uppercase">Terms & Conditions</h1>
                <p className="text-xs md:text-sm font-bold tracking-widest text-gray-500 uppercase">The Protocol of the Permanent Collective</p>
            </div>

            {/* Core Policies */}
            <div className="space-y-12 animate-slide-up stagger-1">
                <section>
                    <h2 className="text-xl font-serif font-bold mb-4 uppercase tracking-widest border-b border-gray-200 pb-2 flex items-center gap-3">
                        <i className="icon-circle-alert text-lg"></i> Return Policy
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        Returns accepted within 2 days ONLY for damaged products. To maintain the exclusivity and integrity of our Permanent Collective, we urge you to consult our sizing and material specifications carefully before securing your artifact.
                    </p>
                </section>
                
                <section>
                    <h2 className="text-xl font-serif font-bold mb-4 uppercase tracking-widest border-b border-gray-200 pb-2 flex items-center gap-3">
                        <i className="icon-truck text-lg"></i> Shipping Policy
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        We provide guaranteed 7-day delivery nationwide. Every artifact is securely packaged and dispatched from our origin node with meticulous care to ensure it arrives in pristine condition.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-serif font-bold mb-4 uppercase tracking-widest border-b border-gray-200 pb-2 flex items-center gap-3">
                        <i className="icon-gem text-lg"></i> Quality Promise
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        Every piece is a Quality Product built from exceptional, aerospace-grade and premium organic materials. We commit to an uncompromising dark aesthetic and precision engineering that withstands the test of time.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-serif font-bold mb-4 uppercase tracking-widest border-b border-gray-200 pb-2 flex items-center gap-3">
                        <i className="icon-shield-check text-lg"></i> Brand Trust & Security
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        QRYNTOX is a Trustable brand. All transactions and data are protected by our advanced Auto-Secure processing systems, ensuring your identity and payment details remain strictly confidential.
                    </p>
                </section>
            </div>

            {/* From the Founder */}
            <div className="mt-24 pt-16 border-t border-gray-200 animate-slide-up stagger-2">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight uppercase">From the Founder</h2>
                </div>
                
                <div className="bg-[#F8F8F8] p-8 md:p-12 border border-gray-200 rounded-sm relative">
                    <i className="icon-quote text-4xl text-gray-300 absolute top-6 left-6 opacity-50"></i>
                    
                    <div className="relative z-10 pl-6 md:pl-10">
                        <p className="text-base md:text-lg text-[#111111] leading-relaxed mb-6 font-serif italic">
                            "I am Shamjid, the founder of QRYNTOX. As a Malayali entrepreneur from Thrissur, Kerala, I established this brand to bring a new standard of dark, minimalist luxury to the world. Our node remains registered at HQ - Thrissur."
                        </p>
                        
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                            Driven by the indomitable Malayali spirit of craftsmanship and a global vision, we are building an archive that transcends borders and trends. QRYNTOX is more than a brand; it is a permanent protocol for those who demand excellence without compromise.
                        </p>
                        
                        <div className="mt-10 flex items-center gap-4 border-t border-gray-200 pt-6">
                            <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center font-serif text-2xl font-bold shadow-lg">S</div>
                            <div>
                                <p className="font-bold text-sm uppercase tracking-widest text-[#111111]">Shamjid</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Founder & Chief Architect</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}