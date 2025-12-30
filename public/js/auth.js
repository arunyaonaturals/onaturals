// ================================
// Authentication Module
// ================================

const Auth = {
    // Get current user from storage
    getCurrentUser() {
        // Check localStorage first, then sessionStorage
        let userStr = localStorage.getItem('user');
        if (!userStr) {
            userStr = sessionStorage.getItem('user');
        }
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    // Check if current user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    // Check if user has specific role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // Login user
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Invalid credentials' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Unable to connect to server' };
        }
    },

    // Logout user
    logout() {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    // Verify session with server
    async verifySession() {
        const user = this.getCurrentUser();
        if (!user) {
            return false;
        }

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user.id })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                // Session invalid, clear storage
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Session verification error:', error);
            // On network error, keep session but return false
            return false;
        }
    },

    // Check authentication and redirect if not logged in
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },

    // Get user display name
    getDisplayName() {
        const user = this.getCurrentUser();
        return user ? (user.name || user.username) : 'Guest';
    },

    // Get user initials for avatar
    getInitials() {
        const user = this.getCurrentUser();
        if (!user) return '?';

        const name = user.name || user.username;
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
};

// Export for use in other modules
window.Auth = Auth;
