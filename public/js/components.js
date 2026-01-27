// ================================
// UI Components
// ================================

const UI = {
    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return; // Guard clause

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        }[type] || 'ℹ️';

        toast.innerHTML = `
            <span style="font-size: 1.25rem;">${icon}</span>
            <span class="toast-content">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Create modal
    createModal(title, content, buttons = []) {
        let container = document.getElementById('modalContainer');
        if (!container) {
            // Create container if missing
            container = document.createElement('div');
            container.id = 'modalContainer';
            document.body.appendChild(container);
        }

        const buttonsHTML = buttons.map(btn => {
            const btnTypes = {
                primary: 'btn-primary',
                secondary: 'btn-secondary',
                success: 'btn-success',
                danger: 'btn-danger'
            };
            const btnClass = btnTypes[btn.type] || 'btn-secondary';

            return `
                <button class="btn ${btnClass} ${btn.class || ''}" data-action="${btn.action}">
                    ${btn.label}
                </button>
            `;
        }).join('');

        container.innerHTML = `
            <div class="modal-backdrop" id="modalBackdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">${title}</h2>
                        <button class="modal-close" data-action="close">×</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${buttons.length ? `
                        <div class="modal-footer">
                            ${buttonsHTML}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add event listeners
        const backdrop = document.getElementById('modalBackdrop');
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) this.closeModal();
        });

        container.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        return container;
    },

    // Close modal
    closeModal() {
        const container = document.getElementById('modalContainer');
        if (container) container.innerHTML = '';
    },

    // Create form
    createForm(fields) {
        return fields.map(field => {
            const {
                name, label, type = 'text', required = false, options = [], value = '', placeholder = ''
            } = field;

            let inputHTML;

            if (type === 'select') {
                inputHTML = `
                    <select class="form-select" id="${name}" name="${name}" ${required ? 'required' : ''}>
                        <option value="">Select ${label}</option>
                        ${options.map(opt => `
                            <option value="${opt.value || opt}" ${value === (opt.value || opt) ? 'selected' : ''}>
                                ${opt.label || opt}
                            </option>
                        `).join('')}
                    </select>
                `;
            } else if (type === 'textarea') {
                inputHTML = `
                    <textarea class="form-textarea" id="${name}" name="${name}" 
                              placeholder="${placeholder}" ${required ? 'required' : ''} style="resize: vertical; min-height: 100px;">${value}</textarea>
                `;
            } else {
                inputHTML = `
                    <input type="${type}" class="form-input" id="${name}" name="${name}" 
                           value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>
                `;
            }

            return `
                <div class="form-group">
                    <label class="form-label" for="${name}">
                        ${label} ${required ? '<span style="color: var(--danger);">*</span>' : ''}
                    </label>
                    ${inputHTML}
                </div>
            `;
        }).join('');
    },

    // Create table
    createTable(columns, data, actions = []) {
        if (!data || data.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>No data available</p>
                </div>`;
        }

        const headerHTML = columns.map(col =>
            `<th>${col.label}</th>`
        ).join('');

        const actionsHeader = actions.length ? '<th class="text-center">Actions</th>' : '';

        const rowsHTML = data.map(row => {
            const cellsHTML = columns.map(col => {
                let value = row[col.field];
                if (col.formatter) value = col.formatter(value, row);
                return `<td>${value || '-'}</td>`;
            }).join('');

            const actionButtonsHTML = actions.map(action => {
                const btnTypes = {
                    primary: 'btn-primary',
                    secondary: 'btn-secondary',
                    success: 'btn-success',
                    danger: 'btn-danger'
                };
                const btnClass = btnTypes[action.type] || 'btn-secondary';

                return `
                    <button class="btn btn-sm ${btnClass}" data-action="${action.action}" data-id="${row.id}">
                        ${action.icon || ''} ${action.label}
                    </button>
                `;
            }).join(' ');

            const actionsCell = actions.length ?
                `<td class="text-center" style="white-space: nowrap;">${actionButtonsHTML}</td>` : '';

            return `<tr>${cellsHTML}${actionsCell}</tr>`;
        }).join('');

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>${headerHTML}${actionsHeader}</tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Create search bar
    createSearchBar(placeholder = 'Search...') {
        return `
            <div class="form-group" style="position: relative; max-width: 300px;">
                <input type="text" class="form-input" id="searchInput" placeholder="${placeholder}" style="padding-left: 36px;">
                <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
            </div>
        `;
    },

    // Create stat card
    createStatCard(config) {
        const { icon, label, value, colorClass = 'blue' } = config;

        // Map color class aliases if needed, or rely on CSS .blue .green etc.
        // styles.css handles .stat-icon.blue etc.

        return `
            <div class="stat-card">
                <div class="stat-info">
                    <h3>${label}</h3>
                    <div class="value">${value}</div>
                </div>
                <div class="stat-icon ${colorClass}">
                    ${icon}
                </div>
            </div>
        `;
    },

    // Show loading state
    showLoading() {
        return `
            <div style="text-align: center; padding: 60px;">
                <div class="loading-spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 16px; color: var(--text-light);">Loading...</p>
            </div>
        `;
    },

    // Confirm dialog
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const content = `<p>${message}</p>`;
            const buttons = [
                { label: 'Cancel', type: 'secondary', action: 'cancel' },
                { label: 'Confirm', type: 'primary', action: 'confirm' }
            ];

            const modal = this.createModal(title, content, buttons);

            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            if (confirmBtn) confirmBtn.addEventListener('click', () => {
                this.closeModal();
                resolve(true);
            });

            if (cancelBtn) cancelBtn.addEventListener('click', () => {
                this.closeModal();
                resolve(false);
            });
        });
    }
};
