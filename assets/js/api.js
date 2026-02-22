const API_BASE_URL = `https://pharma-back-1.onrender.com/api`;

const api = {
    // Utility for headers
    getHeaders(isFormData = false) {
        const token = localStorage.getItem('token');
        const headers = {};

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Standard AJAX request helper
    async request(endpoint, options = {}) {
        const isFormData = options.body instanceof FormData;
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(isFormData),
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            // Check for unauthorized access
            if (response.status === 401) {
                this.logout();
            }
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    },

    // HTTP Methods
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    },

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Authentication helpers
    isLoggedIn() {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            // Check expiry in JWT token
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch (e) {
            return false;
        }
    },

    async logout() {
        const confirmed = await this.confirm('Are you sure you want to log out?', 'Logout Confirmation');
        if (confirmed) {
            this.forceLogout();
        }
    },

    forceLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    async loadSidebar(activePage) {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        try {
            const response = await fetch('components/sidebar.html');
            if (!response.ok) throw new Error("Sidebar fetch failed");
            const html = await response.text();
            container.innerHTML = html;

            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                // Update user info
                const sName = document.getElementById('sidebarUserName');
                const sRole = document.getElementById('sidebarUserRole');
                if (sName) sName.textContent = user.full_name;
                if (sRole) sRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

                // Update Profile Image
                const sImg = document.getElementById('sidebarUserImg');
                const sIcon = document.getElementById('sidebarUserIcon');
                if (sImg && sIcon && user.image_url && user.image_url !== 'None') {
                    sImg.src = user.image_url;
                    sImg.style.display = 'block';
                    sIcon.style.display = 'none';

                    sImg.onerror = function () {
                        this.style.display = 'none';
                        sIcon.style.display = 'block';
                    };
                }

                // Handle RBAC - Show admin items
                if (user.role === 'admin' || user.role === 'subadmin') {
                    document.querySelectorAll('[data-role="admin"]').forEach(el => {
                        el.style.setProperty('display', 'block', 'important');
                    });
                }

                // Show super-admin items only to top-level admin
                if (user.role === 'admin') {
                    document.querySelectorAll('[data-role="super-admin"]').forEach(el => {
                        el.style.setProperty('display', 'block', 'important');
                    });
                }
            }

            // Mark active
            const activeItem = container.querySelector(`[data-page="${activePage}"]`);
            if (activeItem) activeItem.classList.add('active');

            // Mobile toggle logic (re-attach because old elements are gone)
            const mobileToggle = document.getElementById('mobileToggle');
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            if (mobileToggle && sidebar && overlay) {
                const toggleSidebar = () => {
                    sidebar.classList.toggle('show');
                    overlay.classList.toggle('show');
                };
                mobileToggle.addEventListener('click', toggleSidebar);
                overlay.addEventListener('click', toggleSidebar);
            }
        } catch (err) {
            console.error("Failed to load sidebar:", err);
        }
    },

    // Premium Notifications
    showNotification(message, type = 'success') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon text-${type}">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </div>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }
        }, 4000);
    },

    // Premium Confirmation Dialog
    confirm(message, title = "Are you sure?") {
        return new Promise((resolve) => {
            let overlay = document.querySelector('.custom-confirm-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'custom-confirm-overlay';
                overlay.innerHTML = `
                    <div class="custom-confirm-modal">
                        <div class="confirm-icon"><i class="fas fa-question text-danger"></i></div>
                        <h4 class="confirm-title"></h4>
                        <p class="confirm-message"></p>
                        <div class="confirm-actions">
                            <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                            <button class="confirm-btn confirm-btn-danger">Confirm</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }

            overlay.querySelector('.confirm-title').textContent = title;
            overlay.querySelector('.confirm-message').textContent = message;

            const cancelBtn = overlay.querySelector('.confirm-btn-cancel');
            const confirmBtn = overlay.querySelector('.confirm-btn-danger');

            const handleClose = (result) => {
                overlay.classList.remove('show');
                // Use a controller to cleanup events
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                setTimeout(() => resolve(result), 300);
            };

            cancelBtn.onclick = () => handleClose(false);
            confirmBtn.onclick = () => handleClose(true);

            overlay.classList.add('show');
        });
    }
};

// Global shorthand
window.showAlert = (msg, type) => api.showNotification(msg, type);

// Global utility for password visibility
window.togglePassword = function (inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const icon = iconEl.querySelector('i') || iconEl;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Check authentication on page load (except for login page)
if (!window.location.pathname.endsWith('login.html') && !api.isLoggedIn()) {
    api.forceLogout();
}
