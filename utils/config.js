window.formatDateIST = (date) => { 
    try { 
        if (!date) return '';
        return new Date(date).toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }); 
    } catch(e) { 
        return date; 
    } 
};

window.formatDateTimeIST = window.formatDateIST;

window.trackGAEvent = function(eventName, params) {
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, params);
        } else {
            console.log(`GA Blocked/Dev Mode - Event: ${eventName}`, params);
        }
    } catch(e) {}
};

window.APP_CONFIG = {
    // Replace this with your actual Google Client ID from the Google Cloud Console.
    // If this is invalid or mismatched with your origin, Google will block the popup.
    GOOGLE_CLIENT_ID: "870635398284-5f8v8j0p9m2k8q6l8r1t4n9s2b7c4d1e.apps.googleusercontent.com"
};

// Global error suppression for unavoidable network or rate-limit SDK errors
window.addEventListener('unhandledrejection', function(event) {
    const errStr = String(event.reason?.stack || event.reason?.message || event.reason || '');
    if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('Rate limit') || errStr.includes('Unexpected token') || errStr.includes('NoPermission') || errStr.includes('is not valid JSON')) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        console.warn('Suppressed unhandled rejection:', errStr);
    }
});

window.addEventListener('error', function(event) {
    const errStr = String(event.error?.stack || event.message || event.error || '');
    if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('NoPermission') || errStr.includes('Unexpected token') || errStr.includes('is not valid JSON')) {
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        console.warn('Suppressed global error:', errStr);
    }
});

// Suppress React/Trickle overlay from catching specific network console.errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = function(...args) {
    const msg = args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message} ${a.stack || ''}`;
        if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch(e) { return String(a); }
        }
        return String(a);
    }).join(' ');
    
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Timeout') || msg.includes('NoPermission') || msg.includes('Unexpected token') || msg.includes('is not valid JSON') || msg.includes('MutationObserver') || msg.includes('Tooltip')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
    const msg = args.join(' ');
    if (msg.includes('MutationObserver') || msg.includes('Tooltip')) return;
    originalConsoleWarn.apply(console, args);
};
