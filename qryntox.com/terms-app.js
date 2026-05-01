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
          <div className="text-center p-8 rounded-xl max-w-md">
            <i className="icon-circle-alert text-4xl text-red-500 mb-4 mx-auto"></i>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white text-dark-900 rounded-md font-medium">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TermsApp() {
  try {
    return (
      <div className="font-sans min-h-screen flex flex-col selection:bg-black selection:text-white" data-name="terms-app" data-file="terms-app.js">
        <Header />
        <CartDrawer />
        <main className="flex-grow pt-24 bg-white">
          <TermsPage />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('TermsApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <TermsApp />
  </ErrorBoundary>
);