// Central source of truth for Firebase Initialization
// This file can be imported in any HTML file requiring Firebase

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "qryntox-app.firebaseapp.com",
    projectId: "qryntox-app",
    storageBucket: "qryntox-app.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase only if it hasn't been initialized yet and compat library is loaded
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export for module usage (if using bundlers later)
window.firebaseConfig = firebaseConfig;
window.db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
window.auth = typeof firebase !== 'undefined' ? firebase.auth() : null;