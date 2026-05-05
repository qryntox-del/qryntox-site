class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">
          <div className="text-center p-8 glass-panel rounded-xl max-w-md">
            <i className="icon-circle-alert text-4xl text-red-500 mb-4 mx-auto"></i>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="btn btn-primary w-full">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProductsApp() {
  try {
    return (
      <div className="font-sans min-h-screen flex flex-col selection:bg-white selection:text-dark-900" data-name="products-app" data-file="products-app.js">
        <Header />
        <CartDrawer />
        <main className="flex-grow pt-24">
          <ProductsPage />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('ProductsApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <ProductsApp />
  </ErrorBoundary>
);