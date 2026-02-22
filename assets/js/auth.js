/**
 * Auth module for login and session management
 */
const auth = {
    async login(email, password) {
        try {
            const result = await api.post('/auth/login', { email, password });
            if (result.success) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));
                return { success: true };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    checkAccess() {
        if (!api.isLoggedIn()) {
            api.logout();
        }
    }
};

// Auto-check access if not on login/index page
if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
    auth.checkAccess();
}
