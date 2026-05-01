const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <div className="flex flex-col min-h-screen">
            <Header />
            <CartDrawer />
            <main className="flex-grow pt-24 pb-12">
                <TrackOrderPage />
            </main>
            <Footer />
        </div>
    </React.StrictMode>
);