const user = window.AuthManager ? window.AuthManager.getUser() : null;

// Security Check: Redirect if not logged in
if (!user) {
    window.location.href = 'index.html';
} else {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <div className="flex flex-col min-h-screen">
                <Header />
                <CartDrawer />
                <main className="flex-grow pt-24 pb-12 bg-gray-50">
                    <FirebaseCustomerOrders />
                </main>
                <Footer />
            </div>
        </React.StrictMode>
    );
}