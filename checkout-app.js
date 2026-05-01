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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('ErrorBoundary caught an error:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center bg-white text-[#111111]">Error</div>;
    return this.props.children;
  }
}
function App() {
  return (
    <div className="font-sans min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24"><CheckoutPage /></main>
      <Footer />
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);