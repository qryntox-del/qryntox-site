window.AuthManager = {
    getUser: () => {
        try {
            // Ensure strict persistence checking (browserLocalPersistence equivalent)
            const userStr = localStorage.getItem('qryntox_currentUser');
            if (!userStr) return null;
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },
    login: async (phone, name = 'Guest') => {
        // Private Brain Reset: Full data wipe of previous user's local data before loading new one
        localStorage.removeItem('qryntox_local_orders');
        localStorage.removeItem('qryntox_customer_details');
        localStorage.removeItem('qryntox_currentUser');
        
        const rawPhone = phone.replace(/\D/g, '');
        let user = { phone: rawPhone, name, address: {}, wishlist: [] };
        
        try {
            if (window.trickleListObjects) {
                const res = await window.trickleListObjects('users', 100, false, undefined);
                const dbUser = res.items.find(u => {
                    try {
                        const pd = JSON.parse(u.objectData.profileData);
                        return pd.phone === rawPhone;
                    } catch(e) { return false; }
                });

                if (dbUser && dbUser.objectId) {
                    user.uid = dbUser.objectId; // Auto-generated UID tracking
                    user.id = dbUser.objectId;
                    user = { ...user, ...dbUser.objectData };
                    if (dbUser.objectData.profileData) {
                        try {
                            const pd = JSON.parse(dbUser.objectData.profileData);
                            user = { ...user, ...pd };
                        } catch(e) {}
                    }
                } else if (window.trickleCreateObject) {
                    // Auto-generate UID via database creation
                    const newDbUser = await window.trickleCreateObject('users', {
                        name: name,
                        email: `${rawPhone}@qryntox.com`,
                        profileData: JSON.stringify({ phone: rawPhone, address: {}, wishlist: [] })
                    });
                    user.uid = newDbUser.objectId;
                    user.id = newDbUser.objectId;
                }
            }
        } catch (e) {
            console.warn("DB login fetch failed, using local fallback", e);
            const fallbackUid = 'usr_' + Math.random().toString(36).substr(2, 9);
            user.uid = fallbackUid;
            user.id = fallbackUid;
        }

        // Permanent Session Persistence: 'browserLocalPersistence' equivalent
        localStorage.setItem('qryntox_currentUser', JSON.stringify(user));
        // Global State Sync: Backup for Auth state
        localStorage.setItem('userPhone', rawPhone);
        
        // Merge guest cart securely
        const guestCart = JSON.parse(localStorage.getItem('qryntox_cart_guest') || '[]');
        if (guestCart.length > 0) {
            const userCart = JSON.parse(localStorage.getItem(`qryntox_cart_${user.uid}`) || '[]');
            const merged = [...userCart];
            guestCart.forEach(gItem => {
                const existing = merged.find(i => i.id === gItem.id && i.size === gItem.size);
                if (existing) {
                    existing.quantity += gItem.quantity;
                } else {
                    merged.push(gItem);
                }
            });
            localStorage.setItem(`qryntox_cart_${user.uid}`, JSON.stringify(merged));
            localStorage.removeItem('qryntox_cart_guest');
        }
        window.dispatchEvent(new Event('authUpdated'));
        window.dispatchEvent(new Event('cartUpdated'));
        
        // Mobile Redirect: Redirect to Shop page
        if (window.location.pathname.indexOf('products.html') === -1) {
            window.location.href = 'products.html';
        }
    },
    logout: () => {
        // Full cleanup to ensure the next user doesn't access the previous private brain
        localStorage.clear();
        
        window.dispatchEvent(new Event('authUpdated'));
        window.dispatchEvent(new Event('cartUpdated'));
        window.location.href = 'index.html';
    },
    updateProfile: async (data) => {
        const currentUser = window.AuthManager.getUser();
        if (!currentUser || !currentUser.uid) return;
        
        const updated = { ...currentUser, ...data };
        localStorage.setItem('qryntox_currentUser', JSON.stringify(updated));
        
        if (window.trickleUpdateObject && currentUser.uid && !currentUser.uid.startsWith('usr_')) {
            try {
                // Strictly use UID for DB Object Update
                await window.trickleUpdateObject('users', currentUser.uid, {
                    name: updated.name || 'Guest',
                    email: updated.email || `${currentUser.phone || 'guest'}@qryntox.com`,
                    profileData: JSON.stringify({
                        phone: updated.phone,
                        address: updated.address || {}
                    })
                });
            } catch (e) {
                console.warn("Failed to sync profile to DB", e);
            }
        }
        
        window.dispatchEvent(new Event('authUpdated'));
    },
    toggleWishlist: (productId) => {
        const currentUser = window.AuthManager.getUser();
        if (!currentUser) return false;
        
        let wishlist = currentUser.wishlist || [];
        const phone = currentUser.phone;
        let newlyLiked = false;

        if (wishlist.includes(productId)) {
            wishlist = wishlist.filter(id => id !== productId);
            newlyLiked = false;
            // Remove from specific path: /users/{phoneNumber}/favorites/{productId}
            if (window.trickleListObjects && window.trickleDeleteObject && phone) {
                window.trickleListObjects(`favorites:${phone}`, 100, true).then(res => {
                    if (res && res.items) {
                        const target = res.items.find(item => item.objectData.productId === productId);
                        if (target) {
                            window.trickleDeleteObject(`favorites:${phone}`, target.objectId).catch(e => console.warn(e));
                        }
                    }
                }).catch(e => console.warn("Failed to fetch and delete favorite", e));
            }
        } else {
            wishlist.push(productId);
            newlyLiked = true;
            // Save to specific path: /users/{phoneNumber}/favorites/{productId}
            if (window.trickleCreateObject && phone) {
                // Just create directly, avoiding the failing update call which triggers global error toasts
                window.trickleCreateObject(`favorites:${phone}`, { productId, timestamp: Date.now() })
                    .catch(e => console.warn("Failed to create favorite", e));
            }
        }
        
        window.AuthManager.updateProfile({ wishlist });
        window.dispatchEvent(new Event('wishlistUpdated'));
        return newlyLiked;
    },
    getWishlist: () => {
        const currentUser = window.AuthManager.getUser();
        return currentUser ? (currentUser.wishlist || []) : [];
    }
};

window.CartManager = {
    getCartKey: () => {
        const user = window.AuthManager.getUser();
        return user ? `qryntox_cart_${user.phone}` : 'qryntox_cart_guest';
    },
    getItems: () => {
        try {
            // Migration for older 'qryntox_cart'
            const oldCart = localStorage.getItem('qryntox_cart');
            if (oldCart) {
                localStorage.setItem('qryntox_cart_guest', oldCart);
                localStorage.removeItem('qryntox_cart');
            }
            return JSON.parse(localStorage.getItem(window.CartManager.getCartKey()) || '[]');
        } catch (e) {
            return [];
        }
    },
    addItem: (product, quantity = 1, size = null) => {
        const items = window.CartManager.getItems();
        const existing = items.find(i => i.id === product.objectId && (i.size || null) === (size || null));
        if (existing) {
            existing.quantity += quantity;
        } else {
            items.push({ id: product.objectId, size, ...product.objectData, quantity, maxStock: product.objectData.stock });
        }
        localStorage.setItem(window.CartManager.getCartKey(), JSON.stringify(items));
        window.dispatchEvent(new Event('cartUpdated'));
    },
    removeItem: (productId, size = null) => {
        let items = window.CartManager.getItems();
        items = items.filter(i => !(i.id === productId && (i.size || null) === (size || null)));
        localStorage.setItem(window.CartManager.getCartKey(), JSON.stringify(items));
        window.dispatchEvent(new Event('cartUpdated'));
    },
    clearCart: () => {
        localStorage.setItem(window.CartManager.getCartKey(), '[]');
        window.dispatchEvent(new Event('cartUpdated'));
    },
    getTotal: () => {
        const items = window.CartManager.getItems();
        return items.reduce((sum, item) => {
            const price = parseFloat(String(item.price || '0').replace(/[^0-9.]/g, '')) || 0;
            return sum + (price * item.quantity);
        }, 0);
    }
};