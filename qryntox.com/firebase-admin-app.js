function App() {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans" data-name="app-container" data-file="firebase-admin-app.js">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded">
                        <i className="icon-package"></i>
                    </div>
                    <span className="font-bold tracking-widest uppercase">QRYNTOX</span>
                </div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <i className="icon-user text-lg"></i> Admin Session
                </div>
            </nav>
            <main>
                <FirebaseAdminOrders />
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);