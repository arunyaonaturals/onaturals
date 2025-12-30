// ================================
// Billing Module - Tableau-style Design
// ================================

const Billing = {
    currentBills: [],
    stores: [],
    viewMode: 'all', // 'all', 'daily', 'monthly', 'salesperson', 'form'
    editingBill: null,

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #d62728; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const [billsResponse, storesResponse] = await Promise.all([
                fetch('/api/billing'),
                fetch('/api/stores')
            ]);
            this.currentBills = await billsResponse.json();
            this.stores = await storesResponse.json();

            // Calculate stats
            const totalBills = this.currentBills.length;
            const totalAmount = this.currentBills.reduce((sum, b) => sum + (parseFloat(b.billAmount) || 0), 0);
            const totalPaid = this.currentBills.reduce((sum, b) => sum + (parseFloat(b.paymentAmount) || 0), 0);
            const pending = totalAmount - totalPaid;

            contentArea.innerHTML = `
                <!-- Tableau-style Billing -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d62728;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">🧾</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Billing Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Track sales and payments</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="billing-tab-btn ${this.viewMode === 'all' ? 'active' : ''}" data-view="all">📋 All</button>
                            <button class="billing-tab-btn ${this.viewMode === 'daily' ? 'active' : ''}" data-view="daily">📅 Daily</button>
                            <button class="billing-tab-btn ${this.viewMode === 'monthly' ? 'active' : ''}" data-view="monthly">📊 Monthly</button>
                            <button class="billing-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" data-view="form" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">➕ Add</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Bills', totalBills.toString(), 'Invoices', '#1f77b4', '🧾')}
                        ${this.renderKPI('Total Amount', Utils.formatCurrency(totalAmount), 'Billed', '#2ca02c', '💰')}
                        ${this.renderKPI('Paid', Utils.formatCurrency(totalPaid), 'Collected', '#9467bd', '✅')}
                        ${this.renderKPI('Pending', Utils.formatCurrency(pending), 'Outstanding', '#d62728', '⏳')}
                    </div>

                    <!-- Main Content -->
                    <div id="billingContent">
                        <div style="background: white; min-height: 400px;">
                            <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 13px; font-weight: 600; color: #333;">🧾 All Bills (${this.currentBills.length})</span>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="text" id="searchInput" placeholder="Search bills..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 200px;">
                                    <button id="importBillingBtn" style="background: #f0f0f0; border: 1px solid #ddd; padding: 5px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">📤 Import</button>
                                    <button id="addBillBtn" style="background: #2ca02c; color: white; border: none; padding: 5px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">➕ Add Bill</button>
                                </div>
                            </div>
                            <div style="max-height: 550px; overflow-y: auto;" id="billingTable">
                                ${this.renderTableContent(this.currentBills)}
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .billing-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .billing-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .billing-tab-btn.active {
                        background: #d62728;
                        border-color: #d62728;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Billing render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading billing: ${error.message}</p>
                </div>
            `;
        }
    },

    renderKPI(label, value, subtitle, color, icon) {
        return `
            <div style="background: white; padding: 14px 16px; border-right: 1px solid #ddd; position: relative;">
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${color};"></div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                    <div>
                        <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">${label}</div>
                        <div style="font-size: 20px; font-weight: 700; color: #333;">${value}</div>
                        <div style="font-size: 10px; color: #888; margin-top: 3px;">${subtitle}</div>
                    </div>
                    <div style="font-size: 20px; opacity: 0.3;">${icon}</div>
                </div>
            </div>
        `;
    },

    renderTableContent(bills) {
        if (bills.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No bills found. Click "Add Bill" to create your first entry!</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Bill No</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Store</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Captain</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Date</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Amount</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Paid</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Status</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #d62728;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${bills.map((b, idx) => {
            const amount = parseFloat(b.billAmount) || 0;
            const paid = parseFloat(b.paymentAmount) || 0;
            const isPaid = paid >= amount;
            return `
                            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                <td style="padding: 8px 12px; color: #1f77b4; font-weight: 500;">${b.billNo}</td>
                                <td style="padding: 8px 12px; font-weight: 500; color: #333;">${b.storeName || '-'}</td>
                                <td style="padding: 8px 12px; color: #666;">${b.salesCaptain || '-'}</td>
                                <td style="padding: 8px 12px; color: #666;">${Utils.formatDateDDMMYYYY(b.billDate)}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #333;">${Utils.formatCurrency(amount)}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #2ca02c;">${Utils.formatCurrency(paid)}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="background: ${isPaid ? '#dff6dd' : '#fde7e9'}; color: ${isPaid ? '#107c10' : '#d13438'}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                        ${isPaid ? 'PAID' : 'PENDING'}
                                    </span>
                                </td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <button data-action="edit" data-id="${b.id}" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 4px;">✏️</button>
                                    <button data-action="delete" data-id="${b.id}" style="background: #fde7e9; border: 1px solid #f3d6d8; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #d13438;">🗑️</button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    renderTable(bills) {
        const columns = [
            { field: 'billNo', label: 'Bill No' },
            { field: 'storeName', label: 'Store Name' },
            { field: 'salesCaptain', label: 'Sales Captain' },
            { field: 'billDate', label: 'Bill Date', formatter: (value) => Utils.formatDateDDMMYYYY(value) },
            { field: 'billAmount', label: 'Bill Amount', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'paymentAmount', label: 'Payment', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'paymentMode', label: 'Payment Mode' },
            { field: 'paymentDate', label: 'Payment Date', formatter: (value) => Utils.formatDateDDMMYYYY(value) },
            { field: 'remarks', label: 'Remarks' }
        ];

        const actions = [
            { label: '🖨️', action: 'print', type: 'primary' },
            { label: '✏️', action: 'edit', type: 'secondary' },
            { label: '🗑️', action: 'delete', type: 'secondary' }
        ];

        return UI.createTable(columns, bills, actions);
    },

    renderDailySummary(data) {
        const columns = [
            { field: 'billDate', label: 'Date' },
            { field: 'salesCaptain', label: 'Sales Captain' },
            { field: 'billCount', label: 'Bills' },
            { field: 'totalBillAmount', label: 'Total Bill', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'totalPaymentAmount', label: 'Total Payment', formatter: (value) => Utils.formatCurrency(value) }
        ];
        return UI.createTable(columns, data, []);
    },

    renderMonthlySummary(data) {
        const columns = [
            { field: 'month', label: 'Month' },
            { field: 'salesCaptain', label: 'Sales Captain' },
            { field: 'billCount', label: 'Bills' },
            { field: 'totalBillAmount', label: 'Total Bill', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'totalPaymentAmount', label: 'Total Payment', formatter: (value) => Utils.formatCurrency(value) }
        ];
        return UI.createTable(columns, data, []);
    },

    renderSalespersonSummary(data) {
        const columns = [
            { field: 'salesCaptain', label: 'Sales Captain' },
            { field: 'billCount', label: 'Total Bills' },
            { field: 'totalBillAmount', label: 'Total Bill Amount', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'totalPaymentAmount', label: 'Total Collected', formatter: (value) => Utils.formatCurrency(value) },
            { field: 'pendingAmount', label: 'Pending', formatter: (value) => Utils.formatCurrency(value) }
        ];
        return UI.createTable(columns, data, []);
    },

    attachEventListeners() {
        document.getElementById('addBillBtn')?.addEventListener('click', () => {
            // Navigate to Sales Orders page for creating invoices
            window.location.hash = 'sales';
            if (window.App && window.App.navigateTo) {
                window.App.navigateTo('sales');
            }
        });

        document.getElementById('importBillingBtn')?.addEventListener('click', () => {
            this.showImportDialog();
        });

        document.getElementById('clearBillingBtn')?.addEventListener('click', async () => {
            if (await UI.confirm('Are you sure you want to delete ALL billing records? This action cannot be undone.')) {
                await this.clearAllBills();
            }
        });

        // Month/Year filter event listeners
        document.getElementById('monthFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('yearFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('resetFilters')?.addEventListener('click', () => {
            document.getElementById('monthFilter').value = '';
            document.getElementById('yearFilter').value = '';
            this.applyFilters();
        });

        // View toggle buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const view = e.currentTarget.dataset.view;
                this.viewMode = view;
                await this.loadView(view);

                // Update button states
                document.querySelectorAll('[data-view]').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                e.currentTarget.classList.remove('btn-secondary');
                e.currentTarget.classList.add('btn-primary');
            });
        });

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = this.currentBills.filter(bill =>
                    Utils.searchInObject(bill, searchTerm)
                );
                document.getElementById('billingTable').innerHTML = this.renderTable(filtered);
                this.attachTableActions();
            }, 300));
        }

        this.attachTableActions();
    },

    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        const startYear = 2020; // Start from 2020
        let options = '<option value="">All Years</option>';

        for (let year = currentYear; year >= startYear; year--) {
            options += `<option value="${year}">${year}</option>`;
        }

        return options;
    },

    applyFilters() {
        const month = document.getElementById('monthFilter')?.value;
        const year = document.getElementById('yearFilter')?.value;

        let filtered = [...this.currentBills];

        // Filter by month and year
        if (month || year) {
            filtered = filtered.filter(bill => {
                if (!bill.billDate) return false;

                const billDate = new Date(bill.billDate);
                const billMonth = String(billDate.getMonth() + 1).padStart(2, '0');
                const billYear = String(billDate.getFullYear());

                let matches = true;
                if (month && billMonth !== month) matches = false;
                if (year && billYear !== year) matches = false;

                return matches;
            });
        }

        // Update table
        document.getElementById('billingTable').innerHTML = this.renderTable(filtered);
        document.getElementById('tableTitle').textContent = `Bills (${filtered.length})`;
        this.attachTableActions();
    },

    async loadView(view) {
        const tableContainer = document.getElementById('billingTable');
        const titleEl = document.getElementById('tableTitle');
        tableContainer.innerHTML = UI.showLoading();

        try {
            let data, html;
            switch (view) {
                case 'daily':
                    const dailyRes = await fetch('/api/billing/daily');
                    data = await dailyRes.json();
                    html = this.renderDailySummary(data);
                    titleEl.textContent = `Daily Summary (${data.length} entries)`;
                    break;
                case 'monthly':
                    const monthlyRes = await fetch('/api/billing/monthly');
                    data = await monthlyRes.json();
                    html = this.renderMonthlySummary(data);
                    titleEl.textContent = `Monthly Summary (${data.length} entries)`;
                    break;
                case 'salesperson':
                    const spRes = await fetch('/api/billing/by-salesperson');
                    data = await spRes.json();
                    html = this.renderSalespersonSummary(data);
                    titleEl.textContent = `Sales by Salesperson (${data.length} entries)`;
                    break;
                default:
                    const allRes = await fetch('/api/billing');
                    this.currentBills = await allRes.json();
                    html = this.renderTable(this.currentBills);
                    titleEl.textContent = `All Bills (${this.currentBills.length})`;
                    this.attachTableActions();
            }
            tableContainer.innerHTML = html;
            if (view === 'all') this.attachTableActions();
        } catch (error) {
            console.error('Error loading view:', error);
            UI.showToast('Error loading data', 'error');
        }
    },

    attachTableActions() {
        document.querySelectorAll('[data-action="print"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                await this.printInvoice(id);
            });
        });

        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editBill(id);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (await UI.confirm('Are you sure you want to delete this bill?')) {
                    await this.deleteBill(id);
                }
            });
        });
    },

    showBillForm(bill = null) {
        // Get unique sales captains from stores
        const salesCaptains = [...new Set(this.stores.map(s => s.salesCaptain).filter(Boolean))];
        const storeNames = this.stores.map(s => s.storeName).filter(Boolean);

        // Create inline form above the table
        const billingContent = document.getElementById('billingContent');

        // Check if form already visible
        if (document.getElementById('inlineBillForm')) {
            document.getElementById('inlineBillForm').remove();
            return;
        }

        const formHTML = `
            <div id="inlineBillForm" class="card" style="margin-bottom: 1.5rem; border-left: 4px solid #10b981;">
                <div class="card-header">
                    <h2 class="card-title">${bill ? '✏️ Edit Bill' : '➕ Add New Bill'}</h2>
                    <button class="btn btn-secondary btn-sm" id="cancelInlineForm">← Back</button>
                </div>
                <div class="card-body">
                    <form id="billForm">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Bill No *</label>
                                <input type="text" name="billNo" class="form-input" value="${bill?.billNo || ''}" placeholder="e.g., INV001" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Store Name *</label>
                                <select name="storeName" class="form-select" required>
                                    <option value="">Select Store</option>
                                    ${storeNames.map(s => `<option value="${s}" ${bill?.storeName === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Sales Captain *</label>
                                <select name="salesCaptain" class="form-select" required>
                                    <option value="">Select</option>
                                    ${salesCaptains.map(s => `<option value="${s}" ${bill?.salesCaptain === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bill Date *</label>
                                <input type="date" name="billDate" class="form-input" value="${bill?.billDate || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bill Amount *</label>
                                <input type="number" name="billAmount" class="form-input" value="${bill?.billAmount || ''}" placeholder="0" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Amount</label>
                                <input type="number" name="paymentAmount" class="form-input" value="${bill?.paymentAmount || ''}" placeholder="0" step="0.01">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Mode</label>
                                <select name="paymentMode" class="form-select">
                                    <option value="">Select</option>
                                    ${['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Credit'].map(m => `<option value="${m}" ${bill?.paymentMode === m ? 'selected' : ''}>${m}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Date</label>
                                <input type="date" name="paymentDate" class="form-input" value="${bill?.paymentDate || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Remarks</label>
                                <input type="text" name="remarks" class="form-input" value="${bill?.remarks || ''}" placeholder="Any notes...">
                            </div>
                        </div>
                        <div style="margin-top: 1rem; display: flex; gap: 0.75rem;">
                            <button type="submit" class="btn btn-primary">${bill ? '💾 Update Bill' : '➕ Add Bill'}</button>
                            <button type="button" class="btn btn-secondary" id="cancelFormBtn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        billingContent.insertAdjacentHTML('afterbegin', formHTML);

        // Store bill id for editing
        this.editingBill = bill;

        // Cancel button handlers
        document.getElementById('cancelInlineForm')?.addEventListener('click', () => {
            document.getElementById('inlineBillForm')?.remove();
            this.editingBill = null;
        });

        document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
            document.getElementById('inlineBillForm')?.remove();
            this.editingBill = null;
        });

        // Form submit
        document.getElementById('billForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const form = e.target;
            const formData = new FormData(form);
            const billData = Object.fromEntries(formData);
            billData.billAmount = parseFloat(billData.billAmount) || 0;
            billData.paymentAmount = parseFloat(billData.paymentAmount) || 0;

            try {
                let url = '/api/billing';
                let method = 'POST';

                if (this.editingBill) {
                    url = `/api/billing/${this.editingBill.id}`;
                    method = 'PUT';
                }

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(billData)
                });

                if (!response.ok) throw new Error('API request failed');

                UI.showToast(this.editingBill ? '✅ Bill updated successfully' : '✅ Bill added successfully', 'success');
                this.editingBill = null;
                this.render();
            } catch (error) {
                console.error('Error saving bill:', error);
                UI.showToast('Error saving bill', 'error');
            }
        });

        // Focus on first field
        document.querySelector('#billForm [name="billNo"]')?.focus();
    },

    async editBill(id) {
        const bill = this.currentBills.find(b => b.id === id);
        if (!bill) {
            UI.showToast('Bill not found', 'error');
            return;
        }

        try {
            // Find the corresponding sales order by invoice number (billNo)
            const response = await fetch('/api/sales-orders');
            const allInvoices = await response.json();

            const invoice = allInvoices.find(inv => inv.invoiceNo === bill.billNo);

            if (!invoice) {
                UI.showToast('⚠️ No invoice found for this bill. This billing entry may have been created manually.', 'warning');
                return;
            }

            // Fetch full invoice details with items
            const detailResponse = await fetch(`/api/sales-orders/${invoice.id}`);
            const fullInvoice = await detailResponse.json();

            // Store the invoice data globally so Sales module can access it
            window.pendingEditInvoice = fullInvoice;

            // Navigate to Sales page - it will detect pendingEditInvoice and load the form
            window.location.hash = 'sales';
            if (window.App && window.App.navigateTo) {
                window.App.navigateTo('sales');
            }

            UI.showToast('📝 Loading invoice for editing...', 'info');

        } catch (error) {
            console.error('Error loading invoice for edit:', error);
            UI.showToast('Error loading invoice: ' + error.message, 'error');
        }
    },

    async deleteBill(id) {
        try {
            const response = await fetch(`/api/billing/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');

            UI.showToast('Bill deleted successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting bill:', error);
            UI.showToast('Error deleting bill', 'error');
        }
    },

    async clearAllBills() {
        try {
            const response = await fetch('/api/billing', { method: 'DELETE' });
            if (!response.ok) throw new Error('Clear failed');

            UI.showToast('All billing records cleared successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error clearing billing:', error);
            UI.showToast('Error clearing billing records', 'error');
        }
    },

    showImportDialog() {
        const content = `
            <div>
                <p style="margin-bottom: var(--spacing-lg); color: var(--gray-700);">
                    Upload a CSV file with billing data.<br>
                    <small>Columns: billNo, storeName, salesCaptain, billDate, billAmount, paymentAmount, paymentMode, paymentDate, remarks</small>
                </p>
                <input type="file" id="fileInput" accept=".csv" class="form-input">
            </div>
        `;

        const buttons = [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: 'Import', type: 'primary', action: 'import' }
        ];

        UI.createModal('Import Billing Data', content, buttons);

        document.querySelector('[data-action="import"]')?.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];

            if (!file) {
                UI.showToast('Please select a file', 'error');
                return;
            }

            this.importCSV(file);
        });
    },

    async importCSV(file) {
        try {
            const text = await file.text();
            const data = Utils.parseCSV(text);

            if (data.length === 0) {
                UI.showToast('No data found in CSV file', 'error');
                return;
            }

            const response = await fetch('/api/billing/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Import failed');
            }

            const result = await response.json();
            UI.showToast(result.message || 'Import successful', 'success');
            UI.closeModal();
            this.render();

        } catch (error) {
            console.error('Error importing CSV:', error);
            UI.showToast('Error importing data: ' + error.message, 'error');
        }
    },

    async printInvoice(billId) {
        try {
            // Get the billing record from API
            const billResponse = await fetch(`/api/billing/${billId}`);
            if (!billResponse.ok) {
                UI.showToast('Bill not found', 'error');
                return;
            }
            const bill = await billResponse.json();

            // Find the corresponding sales invoice by invoice number (billNo)
            const response = await fetch('/api/sales-orders');
            const allInvoices = await response.json();

            const invoice = allInvoices.find(inv => inv.invoiceNo === bill.billNo);

            if (!invoice) {
                UI.showToast('⚠️ No invoice found for this bill. This may be a manually created billing entry.', 'warning');
                return;
            }

            // Fetch full invoice details with items
            const detailResponse = await fetch(`/api/sales-orders/${invoice.id}`);
            const fullInvoice = await detailResponse.json();

            // Use Sales module's print function
            if (window.Sales && typeof window.Sales.printInvoice === 'function') {
                window.Sales.printInvoice(fullInvoice);
            } else {
                UI.showToast('Print function not available', 'error');
            }

        } catch (error) {
            console.error('Error printing invoice:', error);
            UI.showToast('Error printing invoice: ' + error.message, 'error');
        }
    }
};
