import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB6s2DenrYzPA5GHd4ORfN2odKrBh6DqJ0",
  authDomain: "qryntox-web.firebaseapp.com",
  projectId: "qryntox-web",
  storageBucket: "qryntox-web.firebasestorage.app",
  messagingSenderId: "837437496965",
  appId: "1:837437496965:web:3e61b70d57937209c953ec"
};

const app = initializeApp(firebaseConfig);
window.db = getFirestore(app);