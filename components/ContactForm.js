function ContactForm({ onSubmit }) {
    const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
    const [status, setStatus] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        setStatus('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setStatus(''), 3000);
    };

    return (
        <section className="py-24 bg-gray-50 text-black px-6 border-t border-gray-200" data-name="contact-form" data-file="components/ContactForm.js">
            <div className="container mx-auto max-w-2xl text-center animate-slide-up">
                <h2 className="text-3xl md:text-4xl font-serif font-bold uppercase tracking-widest mb-4">Contact the Archive</h2>
                <p className="text-sm text-gray-500 font-sans mb-10">Have a question about an artifact or need assistance? Reach out to us.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Name</label>
                            <input required type="text" placeholder="Your Name" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                            <input required type="email" placeholder="Your Email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors rounded-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Message</label>
                        <textarea required placeholder="How can we help you?" rows="4" value={formData.message} onChange={e=>setFormData({...formData, message: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors resize-none rounded-sm"></textarea>
                    </div>
                    <button type="submit" className="w-full bg-black text-white font-bold text-xs uppercase tracking-widest py-4 hover:bg-gray-800 transition-colors mt-2 shadow-md rounded-sm">Send Inquiry</button>
                </form>
                {status && <p className="text-green-600 text-xs font-bold uppercase tracking-widest mt-6 animate-fade-in"><i className="icon-circle-check mr-1 text-sm"></i>{status}</p>}
            </div>
        </section>
    );
}