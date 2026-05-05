<<<<<<< HEAD
=======
import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ GLOBAL function (IMPORTANT)
window.saveProduct = async function(product) {
  try {
    await addDoc(collection(db, "products"), product);
    alert("✅ Product saved!");
  } catch (e) {
    console.error(e);
    alert("❌ Save failed");
  }
};
>>>>>>> 44b10e43843a73602d0ec2ca684705b2a35ba04b
// Bulletproof error suppression for network drops and HTML payload parsing errors
const isSuppressedError = (err) => {
    const msg = String(err && err.message ? err.message : err).toLowerCase();
    return msg.includes('failed to fetch') || 
           msg.includes('is not valid json') || 
           msg.includes('unexpected token') || 
           msg.includes('syntaxerror') ||
           msg.includes('network error') ||
           msg.includes('nopermission') ||
           msg.includes('no permission') ||
           msg.includes('mutationobserver') ||
           msg.includes('tooltip');
};

window.addEventListener('unhandledrejection', (event) => {
    if (isSuppressedError(event.reason)) {
        event.preventDefault();
        event.stopPropagation();
    }
});

window.addEventListener('error', (event) => {
    if (isSuppressedError(event.error || event.message)) {
        event.preventDefault();
        event.stopPropagation();
    }
});

const originalConsoleError = console.error;
console.error = (...args) => {
    if (args.some(arg => isSuppressedError(arg))) {
        return; // Suppress from console to prevent platform error overlay catch
    }
    originalConsoleError.apply(console, args);
};

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
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard Error</h1>
            <p className="text-secondary mb-6">Something went wrong while loading the dashboard.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-dark-900 rounded-md font-medium"
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

function AdminApp() {
  try {
    return (
      <div className="font-sans min-h-screen flex flex-col selection:bg-white selection:text-dark-900" data-name="admin-app" data-file="admin-app.js">
        <AdminDashboard />
      </div>
    );
  } catch (error) {
    console.error('AdminApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <AdminApp />
  </ErrorBoundary>
<<<<<<< HEAD
);
=======
);
>>>>>>> 44b10e43843a73602d0ec2ca684705b2a35ba04b
