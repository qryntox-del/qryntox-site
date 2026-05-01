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
            <p className="text-secondary mb-6">We're sorry, but something unexpected happened while loading QRYNTOX.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

window.formatDateIST = function(dateInput) {
    if (!dateInput) return 'Pending';
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

window.clearAndResetProducts = function() {
    localStorage.removeItem('qryntox_local_products');
    localStorage.removeItem('qryntox_db_init_v4');
    console.log('Product keys cleared from localStorage');
    window.dispatchEvent(new Event('productsUpdated'));
};

function App() {
  const [customerInquiries, setCustomerInquiries] = React.useState([]);

  React.useEffect(() => {
      try {
          const stored = JSON.parse(localStorage.getItem('qryntox_customers') || '[]');
          setCustomerInquiries(stored);
      } catch(e) {
          console.error('Failed to load inquiries', e);
      }

      // Auth State Observer - Strict Persistence Check
      const observeAuth = () => {
          const backupPhone = localStorage.getItem('userPhone');
          if (window.AuthManager) {
              const user = window.AuthManager.getUser();
              
              // Absolute Block: If isAuth is true, block popup completely
              const isAuth = backupPhone || user;
              
              if (!isAuth) {
                  setTimeout(() => {
                      // Double check to prevent mobile loop / race condition
                      const recheckAuth = localStorage.getItem('userPhone') || window.AuthManager?.getUser();
                      if (!recheckAuth) {
                          window.dispatchEvent(new Event('requestLogin'));
                      }
                  }, 1500);
              } else {
                  // If currentUser.phone or backup exists, ensure login popup is HIDDEN automatically
                  window.dispatchEvent(new Event('closeLoginModal'));
              }
          }
      };
      
      observeAuth();
      window.addEventListener('authUpdated', observeAuth);
      
      // Android Back-Button Fix
      const handlePopState = () => {
          if (window.AuthManager?.getUser() || localStorage.getItem('userPhone')) {
              window.dispatchEvent(new Event('closeLoginModal'));
          }
      };
      window.addEventListener('popstate', handlePopState);
      
      return () => {
          window.removeEventListener('authUpdated', observeAuth);
          window.removeEventListener('popstate', handlePopState);
      };
  }, []);

  const handleInquirySubmit = (data) => {
      const newInquiry = {
          id: Date.now(),
          date: new Date().toLocaleString(),
          ...data
      };
      const updated = [newInquiry, ...customerInquiries];
      setCustomerInquiries(updated);
      localStorage.setItem('qryntox_customers', JSON.stringify(updated));
  };

  try {
    return (
      <div className="font-sans min-h-screen flex flex-col selection:bg-white selection:text-dark-900" data-name="app" data-file="app.js">
        <Header />
        <CartDrawer />
        
        <main className="flex-grow px-5 md:px-0">
          <Hero />
          <FeaturedProducts />
          <BrandStory />
          <ArchiveAbout />
          <CircularEthics />
          <ContactForm onSubmit={handleInquirySubmit} />
        </main>
        
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Missing AI Agent Function
window.invokeAIAgent = async function(prompt, context) {
    try {
        console.log("Invoking AI Agent with prompt:", prompt);
        // This is where your AI logic sits. 
        // If you are using a specific API, that code goes here.
        // For now, we will create a successful response:
        return {
            success: true,
            data: "AI Generated Description based on: " + context
        };
    } catch (error) {
        console.error("AI Agent Error:", error);
        throw error;
    }
};
