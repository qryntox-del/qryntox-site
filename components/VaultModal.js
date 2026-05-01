function VaultModal({ isOpen, onClose }) {
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === 'sham@qryntox') {
            localStorage.setItem('qryntox_isAuthorized', 'true');
            window.dispatchEvent(new Event('vaultAuthChanged'));
            window.location.href = 'admin.html';
        } else {
            setError('Unauthorized');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-fade-in" data-name="vault-modal" data-file="components/VaultModal.js">
            <div className="relative w-full max-w-md p-10 text-center animate-slide-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors">
                    <i className="icon-x text-2xl"></i>
                </button>
                <h2 className="text-4xl font-serif font-bold tracking-[0.2em] text-white uppercase mb-2">QRYNTOX</h2>
                <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase mb-16">Registered Node: HQ - Thrissur / Kerala</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                    <div className="relative">
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => {setPassword(e.target.value); setError('');}}
                            placeholder="Enter Archive Passcode"
                            className={`w-full bg-transparent border-b ${error ? 'border-red-500' : 'border-gray-700'} pb-4 text-center text-white focus:outline-none focus:border-white font-mono tracking-widest transition-colors text-sm`}
                            autoFocus
                        />
                        {error && <p className="absolute -bottom-6 left-0 right-0 text-red-500 text-[10px] tracking-widest uppercase font-bold animate-fade-in">{error}</p>}
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-bold tracking-[0.2em] uppercase text-xs py-5 hover:bg-gray-200 transition-colors mt-4">
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
}