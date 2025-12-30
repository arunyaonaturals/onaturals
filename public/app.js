// ================================
// Main Application File
// ================================

const App = {
    currentPage: 'dashboard',

    // Page titles for breadcrumb
    pageTitles: {
        dashboard: 'Dashboard',
        stores: 'Stores',
        products: 'Products',
        billing: 'Billing',
        sales: 'Sales Orders',
        despatch: 'Despatch',
        inventory: 'Inventory',
        suppliers: 'Suppliers',
        purchase: 'Purchase Orders',
        staff: 'Staff',
        payroll: 'Payroll',
        settings: 'Settings'
    },

    // Initialize application
    async init() {
        const appContainer = document.getElementById('appContainer');

        try {
            // Check authentication first
            if (!Auth.isAuthenticated()) {
                window.location.href = '/login.html';
                return;
            }

            // Update user display in topbar
            this.updateUserDisplay();

            // Initialize database
            await DB.init();
            console.log('Database initialized successfully');

            // Set up navigation
            this.setupNavigation();

            // Load initial page from hash or default to dashboard
            const initialPage = window.location.hash.substring(1) || 'dashboard';
            this.navigateTo(initialPage);

            // Show the app (remove loading state)
            if (appContainer) {
                appContainer.classList.remove('app-loading');
                appContainer.classList.add('app-ready');
            }

        } catch (error) {
            console.error('Error initializing app:', error);

            // Show the app even on error so user can see the error message
            if (appContainer) {
                appContainer.classList.remove('app-loading');
                appContainer.classList.add('app-ready');
            }

            document.getElementById('contentArea').innerHTML = `
                <div class="text-center py-12">
                    <h2 class="text-red-500 text-xl font-semibold">Error Initializing Application</h2>
                    <p class="text-gray-600 mt-4">${error.message}</p>
                    <button class="btn btn-primary mt-8" onclick="location.reload()">
                        Reload Application
                    </button>
                </div>
            `;
        }
    },

    // Update user display in topbar
    updateUserDisplay() {
        const user = Auth.getCurrentUser();
        if (user) {
            const avatarEl = document.getElementById('userAvatar');
            const nameEl = document.getElementById('userName');
            const menuNameEl = document.getElementById('menuUserName');
            const menuRoleEl = document.getElementById('menuUserRole');

            if (avatarEl) avatarEl.textContent = Auth.getInitials();
            if (nameEl) nameEl.textContent = user.name || user.username;
            if (menuNameEl) menuNameEl.textContent = user.name || user.username;
            if (menuRoleEl) menuRoleEl.textContent = user.role;
        }
    },

    // Setup navigation event listeners
    setupNavigation() {
        // Support both old nav-tab and new nav-link classes
        const navItems = document.querySelectorAll('.nav-link, .nav-tab');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
    },

    // Navigate to a specific page
    navigateTo(page) {
        this.currentPage = page;

        // Update active nav item
        document.querySelectorAll('.nav-link, .nav-tab').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // Update breadcrumb
        const breadcrumbEl = document.getElementById('currentPageTitle');
        if (breadcrumbEl) {
            breadcrumbEl.textContent = this.pageTitles[page] || page;
        }

        // Update URL hash
        window.location.hash = page;

        // Render the appropriate page
        switch (page) {
            case 'dashboard':
                Dashboard.render();
                break;
            case 'stores':
                Stores.render();
                break;
            case 'products':
                Products.render();
                break;
            case 'billing':
                Billing.render();
                break;
            case 'sales':
                Sales.render();
                break;
            case 'despatch':
                Despatch.render();
                break;
            case 'inventory':
                Inventory.render();
                break;
            case 'suppliers':
                Suppliers.render();
                break;
            case 'purchase':
                Purchase.render();
                break;
            case 'staff':
                Staff.render();
                break;
            case 'payroll':
                Payroll.render();
                break;
            case 'settings':
                Settings.render();
                break;
            default:
                Dashboard.render();
        }
    },

    // Render coming soon page for modules not yet implemented
    renderComingSoon(title, description) {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${title}</h1>
                <p class="page-subtitle">${description}</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="empty-state-icon">🚧</div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">Coming Soon</h3>
                        <p style="color: #64748b; max-width: 400px; margin: 0 auto;">
                            This module is currently under development. Check back soon for updates!
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    // Handle browser back/forward
    handleHashChange() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        this.navigateTo(hash);
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();

    // Handle hash changes (back/forward navigation)
    window.addEventListener('hashchange', () => {
        App.handleHashChange();
    });
});

// Handle page visibility change to refresh data (disabled to prevent flashing)
// document.addEventListener('visibilitychange', () => {
//     if (!document.hidden) {
//         // Refresh current page when user returns to tab
//         App.navigateTo(App.currentPage);
//     }
// });

// Toggle user menu dropdown
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenu');
    const trigger = document.querySelector('.user-dropdown-trigger');
    if (menu && trigger && !trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});
