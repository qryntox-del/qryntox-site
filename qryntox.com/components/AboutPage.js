function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-black pt-32 pb-24 selection:bg-black selection:text-white" data-name="about-page" data-file="components/AboutPage.js">
            <div className="container mx-auto px-6 md:px-12 max-w-4xl">
                
                {/* Header */}
                <div className="text-center mb-24 animate-slide-up">
                    <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight uppercase">About QRYNTOX</h1>
                    <div className="w-16 h-px bg-black mx-auto mt-8"></div>
                </div>

                {/* Content Sections */}
                <div className="space-y-20 md:space-y-32">
                    
                    {/* The Origin */}
                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 animate-slide-up stagger-1">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-serif font-bold uppercase tracking-widest text-gray-400">The Origin</h2>
                        </div>
                        <div className="md:w-2/3">
                            <p className="text-lg md:text-xl font-sans leading-relaxed text-black">
                                Founded in Thrissur, Kerala, by Shamjid, QRYNTOX is a response to the fleeting nature of modern fashion.
                            </p>
                        </div>
                    </div>

                    {/* The Philosophy */}
                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 animate-slide-up stagger-2">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-serif font-bold uppercase tracking-widest text-gray-400">The Philosophy</h2>
                        </div>
                        <div className="md:w-2/3">
                            <p className="text-lg md:text-xl font-sans leading-relaxed text-black">
                                We do not create "clothing"; we curate artifacts. Every piece in The Archive is a meticulously crafted silhouette designed for the permanent collective.
                            </p>
                        </div>
                    </div>

                    {/* The Promise */}
                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 animate-slide-up stagger-3">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-serif font-bold uppercase tracking-widest text-gray-400">The Promise</h2>
                        </div>
                        <div className="md:w-2/3">
                            <p className="text-lg md:text-xl font-sans leading-relaxed text-black">
                                Based in the heart of Kerala, we bridge the gap between local craftsmanship and global streetwear aesthetics. We guarantee a 7-day delivery timeline to ensure excellence reaches you without delay.
                            </p>
                        </div>
                    </div>

                    {/* The Policy */}
                    <div className="flex flex-col md:flex-row gap-8 md:gap-16 animate-slide-up stagger-4">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-serif font-bold uppercase tracking-widest text-gray-400">The Policy</h2>
                        </div>
                        <div className="md:w-2/3">
                            <p className="text-lg md:text-xl font-sans leading-relaxed text-black">
                                To maintain exclusivity and quality control, all sales within the collective are final.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Signature */}
                <div className="mt-32 pt-16 border-t border-gray-200 text-right animate-slide-up stagger-4">
                    <p className="text-2xl font-serif font-bold italic tracking-wide text-black">
                        — Shamjid, Founder
                    </p>
                </div>

            </div>
        </div>
    );
}