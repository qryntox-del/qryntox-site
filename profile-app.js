class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('ErrorBoundary caught an error:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div className="min-h-screen flex items-center justify-center">Error</div>;
    return this.props.children;
  }
}
function App() {
  return (
    <div className="font-sans min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-grow pt-24"><ProfilePage /></main>
      <Footer />
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);