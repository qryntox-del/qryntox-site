import AdminDashboard from "./components/AdminDashboard.js";
import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ GLOBAL save function
window.saveProduct = async function(product) {
  try {
    await addDoc(collection(db, "products"), product);
    alert("✅ Product saved!");
  } catch (e) {
    console.error(e);
    alert("❌ Save failed");
  }
};

// ✅ Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h2>Dashboard Error</h2>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ Main App
function AdminApp() {
  return (
    <div>
      <AdminDashboard />
    </div>
  );
}

// ✅ Render
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <AdminApp />
  </ErrorBoundary>
);
