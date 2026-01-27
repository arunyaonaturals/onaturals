// ================================
// UI Components
// ================================

const UI = {
    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');

        const borderColors = {
            success: 'border-l-4 border-accent-green',
            error: 'border-l-4 border-accent-red',
            info: 'border-l-4 border-primary-500',
            warning: 'border-l-4 border-accent-orange'
        };

        toast.className = `bg-white rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in-right ${borderColors[type] || borderColors.info}`;

        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        }[type] || 'ℹ️';

        toast.innerHTML = `
            <span class="text-xl">${icon}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-slide-out-right');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Create modal
    createModal(title, content, buttons = []) {
        const container = document.getElementById('modalContainer');

        const buttonsHTML = buttons.map(btn => {
            const btnTypes = {
                primary: 'bg-primary-600 text-white hover:shadow-lg hover:-translate-y-0.5',
                secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
                success: 'bg-accent-green text-white hover:shadow-lg hover:-translate-y-0.5'
            };
            const btnClass = btnTypes[btn.type] || btnTypes.secondary;

            return `
                <button class="px-6 py-3 border-0 rounded-lg text-base font-semibold cursor-pointer transition-all duration-150 inline-flex items-center gap-2 ${btnClass} ${btn.class || ''}" 
                        data-action="${btn.action}">
                    ${btn.label}
                </button>
            `;
        }).join('');

        container.innerHTML = `
            <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in" id="modalBackdrop">
                <div class="bg-white rounded-2xl shadow-xl max-w-[600px] w-[90%] max-h-[90vh] overflow-y-auto animate-slide-up">
                    <div class="p-6 border-b border-gray-200 flex items-center justify-between">
                        <h2 class="text-xl font-bold text-gray-900">${title}</h2>
                        <button class="bg-transparent border-0 text-2xl cursor-pointer text-gray-500 hover:text-gray-900 transition-colors duration-100" data-action="close">×</button>
                    </div>
                    <div class="p-6">
                        ${content}
                    </div>
                    ${buttons.length ? `
                        <div class="p-6 border-t border-gray-200 flex gap-3 justify-end">
                            ${buttonsHTML}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add event listeners
        const backdrop = document.getElementById('modalBackdrop');

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeModal();
            }
        });

        // Close on close button
        container.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        return container;
    },

    // Close modal
    closeModal() {
        const container = document.getElementById('modalContainer');
        container.innerHTML = '';
    },

    // Create form
    createForm(fields) {
        return fields.map(field => {
            const {
                name,
                label,
                type = 'text',
                required = false,
                options = [],
                value = '',
                placeholder = ''
            } = field;

            let inputHTML;

            if (type === 'select') {
                inputHTML = `
                    <select class="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-base font-sans transition-all duration-150 bg-white focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(12,135,230,0.1)]" id="${name}" name="${name}" ${required ? 'required' : ''}>
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
                    <textarea class="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-base font-sans transition-all duration-150 bg-white resize-y min-h-[100px] focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(12,135,230,0.1)]" id="${name}" name="${name}" 
                              placeholder="${placeholder}" ${required ? 'required' : ''}>${value}</textarea>
                `;
            } else {
                inputHTML = `
                    <input type="${type}" class="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-base font-sans transition-all duration-150 bg-white focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(12,135,230,0.1)]" id="${name}" name="${name}" 
                           value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''}>
                `;
            }

            return `
                <div class="mb-4">
                    <label class="block font-semibold text-gray-700 mb-2 text-sm" for="${name}">
                        ${label} ${required ? '<span class="text-accent-red">*</span>' : ''}
                    </label>
                    ${inputHTML}
                </div>
            `;
        }).join('');
    },

    // Create table
    createTable(columns, data, actions = []) {
        if (!data || data.length === 0) {
            return '<p class="text-center text-gray-500 py-8">No data available</p>';
        }

        const headerHTML = columns.map(col =>
            `<th class="px-4 py-3 text-left font-semibold text-gray-700 text-sm uppercase tracking-wide">${col.label}</th>`
        ).join('');

        const actionsHTML = actions.length ? '<th class="px-4 py-3 text-left font-semibold text-gray-700 text-sm uppercase tracking-wide">Actions</th>' : '';

        const rowsHTML = data.map(row => {
            const cellsHTML = columns.map(col => {
                let value = row[col.field];
                if (col.formatter) {
                    value = col.formatter(value, row);
                }
                return `<td class="px-4 py-3 border-t border-gray-200">${value || '-'}</td>`;
            }).join('');

            const actionButtonsHTML = actions.map(action => {
                const btnTypes = {
                    primary: 'bg-primary-600 text-white',
                    secondary: 'bg-gray-200 text-gray-800',
                    success: 'bg-accent-green text-white'
                };
                const btnClass = btnTypes[action.type] || btnTypes.secondary;

                return `
                    <button class="px-2 py-1 text-xs ${btnClass} rounded transition-all duration-150 cursor-pointer border-0 inline-flex items-center" 
                            data-action="${action.action}" 
                            data-id="${row.id}">
                        ${action.icon || ''} ${action.label}
                    </button>
                `;
            }).join(' ');

            const actionsCellHTML = actions.length ?
                `<td class="px-4 py-3 border-t border-gray-200">${actionButtonsHTML}</td>` : '';

            return `<tr class="transition-colors duration-100 hover:bg-primary-50">${cellsHTML}${actionsCellHTML}</tr>`;
        }).join('');

        return `
            <div class="overflow-x-auto rounded-lg">
                <table class="w-full border-collapse">
                    <thead class="bg-gray-100">
                        <tr>${headerHTML}${actionsHTML}</tr>
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
            <div class="mb-4">
                <input type="text" 
                       class="w-full px-3 py-3 border-2 border-gray-200 rounded-lg text-base font-sans transition-all duration-150 bg-white focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(12,135,230,0.1)]" 
                       id="searchInput" 
                       placeholder="${placeholder}">
            </div>
        `;
    },

    // Create stat card
    createStatCard(config) {
        const { icon, label, value, colorClass = '' } = config;

        const colorClasses = {
            primary: 'border-l-[3px] border-primary-500',
            success: 'border-l-[3px] border-accent-green',
            accent: 'border-l-[3px] border-accent-orange'
        };

        const borderClass = colorClasses[colorClass] || '';

        return `
            <div class="bg-white border border-gray-200 rounded-md p-4 transition-colors duration-150 hover:border-primary-300 ${borderClass}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xl">${icon}</span>
                </div>
                <div class="text-xs text-gray-500 font-medium uppercase tracking-wide">${label}</div>
                <div class="text-2xl font-bold text-gray-900">${value}</div>
            </div>
        `;
    },

    // Show loading state
    showLoading() {
        return `
            <div class="text-center py-12">
                <div class="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
                <p class="mt-4 text-gray-600">Loading...</p>
            </div>
        `;
    },

    // Confirm dialog
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const content = `<p>${message}</p>`;
            const buttons = [
                {
                    label: 'Cancel',
                    type: 'secondary',
                    action: 'cancel'
                },
                {
                    label: 'Confirm',
                    type: 'primary',
                    action: 'confirm'
                }
            ];

            const modal = this.createModal(title, content, buttons);

            modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
                this.closeModal();
                resolve(true);
            });

            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                this.closeModal();
                resolve(false);
            });
        });
    }
};
