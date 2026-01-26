// ================================
// Purchase Orders Module
// ================================

const Purchase = {
    currentOrders: [],
    currentSuppliers: [],
    currentProducts: [],
    viewMode: 'list',
    selectedProducts: new Map(),
    orderTotals: { subtotal: 0, gstTotal: 0, grandTotal: 0 },

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 100px;">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            const [ordersRes, suppliersRes, productsRes] = await Promise.all([
                fetch('/api/purchase-orders'),
                fetch('/api/suppliers'),
                fetch('/api/products')
            ]);

            this.currentOrders = await ordersRes.json();
            this.currentSuppliers = await suppliersRes.json();
            this.currentProducts = await productsRes.json();

            // Calculate stats
            const totalOrders = this.currentOrders.length;
            const pendingOrders = this.currentOrders.filter(o => o.status === 'pending').length;
            const totalValue = this.currentOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);

            contentArea.innerHTML = `
                <!-- Page Header -->
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div class="header-title-wrapper">
                        <h1>Purchase Management</h1>
                        <p>Procurement and supplier orders</p>
                    </div>
                    <div class="tab-nav">
                        <button class="tab-btn ${this.viewMode === 'list' ? 'active' : ''}" onclick="Purchase.showList()">📋 List</button>
                        <button class="tab-btn ${this.viewMode === 'form' ? 'active' : ''}" onclick="Purchase.showNewOrder()">➕ New Order</button>
                    </div>
                </div>

                <!-- KPI Stats -->
                <div class="stats-grid">
                    ${this.renderKPI('Total Orders', totalOrders.toString(), 'In system', 'blue', '📜')}
                    ${this.renderKPI('Pending', pendingOrders.toString(), 'Awaiting delivery', 'orange', '⏳')}
                    ${this.renderKPI('Total Value', Utils.formatCurrency(totalValue), 'All time procurement', 'green', '💰')}
                </div>

                <!-- Main Content -->
                <div id="purchaseContent">
                    ${this.viewMode === 'list' ? this.renderOrdersList() : this.renderForm()}
                </div>
            `;

        } catch (error) {
            console.error('Purchase render error:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p style="color: var(--danger);">Error loading purchase orders: ${error.message}</p>
                </div>
            `;
        }
    },

    renderKPI(label, value, subtitle, colorClass, icon) {
        return `
            <div class="stat-card">
                <div class="stat-info">
                    <h3>${label}</h3>
                    <div class="value">${value}</div>
                    <div class="stat-label">${subtitle}</div>
                </div>
                <div class="stat-icon ${colorClass}">
                    ${icon}
                </div>
            </div>
        `;
    },

    showList() {
        this.viewMode = 'list';
        this.render();
    },

    renderOrdersList() {
        if (this.currentOrders.length === 0) {
            return `
                <div class="card">
                    <div class="card-body empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>No purchase orders found. Click "New Order" to get started!</p>
                    </div>
                </div>`;
        }

        const statusColors = {
            'pending': 'warning',
            'received': 'success',
            'partial': 'info',
            'cancelled': 'danger'
        };

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Purchase Orders (${this.currentOrders.length})</h3>
                    <div style="position: relative;">
                        <input type="text" id="purSearchInput" placeholder="Search orders..." class="form-input" style="width: 250px; padding-left: 32px;">
                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</span>
                    </div>
                </div>
                <div class="table-container" style="border: none; border-radius: 0;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Date</th>
                                <th>Vendor</th>
                                <th style="text-align: right;">Total</th>
                                <th style="text-align: center;">Status</th>
                                <th style="text-align: center;">Payment</th>
                                <th style="text-align: center;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.currentOrders.map((o) => {
            const statusClass = statusColors[o.status] || 'secondary';
            const paymentClass = o.paymentStatus === 'paid' ? 'success' : (o.paymentStatus === 'partial' ? 'warning' : 'danger');
            const paymentLabel = o.paymentStatus ? o.paymentStatus.toUpperCase() : 'UNPAID';

            return `
                                <tr>
                                    <td class="text-primary" style="font-weight: 600;">${o.orderNo}</td>
                                    <td style="color: var(--text-muted);">${o.orderDate || '-'}</td>
                                    <td style="font-weight: 500;">${o.supplierName || '-'}</td>
                                    <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(parseFloat(o.grandTotal || 0))}</td>
                                    <td style="text-align: center;">
                                        <span class="badge badge-${statusClass}">
                                            ${(o.status || 'pending').toUpperCase()}
                                        </span>
                                    </td>
                                    <td style="text-align: center;">
                                        <span class="badge badge-${paymentClass}">
                                            ${paymentLabel}
                                        </span>
                                    </td>
                                    <td style="text-align: center;">
                                        <button onclick="Purchase.viewOrder(${o.id})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 16px;" title="View">👁️</button>
                                        ${o.status === 'pending' ? `<button onclick="Purchase.receiveOrder(${o.id})" class="btn btn-success" style="padding: 4px 8px; font-size: 16px;" title="Receive Items">📦</button>` : ''}
                                        <button onclick="Purchase.deleteOrder(${o.id})" class="btn btn-danger" style="padding: 4px 8px; font-size: 16px;" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    getStatusColor(status) {
        // Redundant with CSS classes but kept for reference if needed
        return '';
    },

    async showNewOrder() {
        this.viewMode = 'form';
        this.selectedProducts.clear();
        this.orderTotals = { subtotal: 0, gstTotal: 0, grandTotal: 0 };

        // Get next PO number
        try {
            const res = await fetch('/api/purchase-orders/next-po-no');
            const { nextPoNo } = await res.json();
            this.nextPoNo = nextPoNo;
        } catch (e) {
            this.nextPoNo = 'PO-001';
        }

        this.render();
    },

    renderForm() {
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 class="page-title">New Purchase Order</h1>
                    <p class="page-subtitle">Create a new purchase order for vendor</p>
                </div>
                <button class="btn btn-secondary" onclick="Purchase.cancelForm()">← Back to List</button>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Order Details</h3>
                </div>
                <div class="card-body">
                    <div class="form-row" style="grid-template-columns: 1fr 1fr 1fr 1fr; display: grid; gap: 20px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">PO Number</label>
                            <input type="text" id="poNumber" class="form-input" value="${this.nextPoNo || ''}" readonly style="background: var(--bg-surface); font-weight: 600;">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Order Date *</label>
                            <input type="date" id="poDate" class="form-input" value="${today}">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Vendor/Supplier *</label>
                            <select id="supplierSelect" class="form-input" required>
                                <option value="">Select Vendor</option>
                                ${this.currentSuppliers.map(s => `
                                    <option value="${s.id}" data-name="${s.supplierName}">${s.supplierCode} - ${s.supplierName}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Expected Delivery</label>
                            <input type="date" id="expectedDelivery" class="form-input">
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <div class="card-header">
                     <h3 class="card-title">Add Products</h3>
                </div>
                <div class="card-body">
                     <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 16px; align-items: end;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Product Name *</label>
                            <input type="text" id="productName" class="form-input" placeholder="Type product name">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Weight/Unit</label>
                            <input type="text" id="productWeight" class="form-input" placeholder="e.g. 10 kg">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Quantity *</label>
                            <input type="number" id="productQty" class="form-input" value="1" min="1">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Rate (₹) *</label>
                            <input type="number" id="productRate" class="form-input" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">GST %</label>
                            <input type="number" id="productGst" class="form-input" value="5" step="0.5">
                        </div>
                        <button class="btn btn-primary" onclick="Purchase.addProduct()" style="height: 42px;">➕ Add</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <div class="card-header">
                    <h3 class="card-title">Order Items</h3>
                </div>
                <div class="table-container" style="border: none; border-radius: 0;">
                    <div id="poItemsTable">
                        ${this.renderItemsTable()}
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 24px;">
                <div class="card-header">
                    <h3 class="card-title">Payment Details</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Payment Status</label>
                            <select id="paymentStatus" class="form-input">
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Payment Amount (₹)</label>
                            <input type="number" id="paymentAmount" class="form-input" placeholder="0.00" step="0.01" min="0">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Payment Date</label>
                            <input type="date" id="paymentDate" class="form-input">
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 32px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="Purchase.cancelForm()">Cancel</button>
                <button class="btn btn-primary" onclick="Purchase.savePurchaseOrder()">Save Purchase Order</button>
            </div>
        `;
    },

    addProduct() {
        const productName = document.getElementById('productName').value.trim();
        const weight = document.getElementById('productWeight').value.trim();
        const qty = parseInt(document.getElementById('productQty').value) || 1;
        const rate = parseFloat(document.getElementById('productRate').value) || 0;
        const gstRate = parseFloat(document.getElementById('productGst').value) || 5;

        if (!productName) {
            UI.showToast('Please enter a product name', 'error');
            return;
        }

        if (rate <= 0) {
            UI.showToast('Please enter a valid rate', 'error');
            return;
        }

        const amount = qty * rate;
        const gstAmount = amount * (gstRate / 100);
        const totalAmount = amount + gstAmount;

        // Use a unique key based on product name + weight
        const productKey = `${productName}-${weight}`;

        this.selectedProducts.set(productKey, {
            productId: null, // Manual entry, no product ID
            productName,
            weight,
            hsnCode: '',
            quantity: qty,
            rate,
            amount,
            gstRate,
            gstAmount,
            totalAmount
        });

        this.calculateTotals();
        document.getElementById('poItemsTable').innerHTML = this.renderItemsTable();

        // Reset form
        document.getElementById('productName').value = '';
        document.getElementById('productWeight').value = '';
        document.getElementById('productQty').value = 1;
        document.getElementById('productRate').value = '';

        UI.showToast('Product added to order!', 'success');
    },

    removeProduct(productId) {
        this.selectedProducts.delete(productId);
        this.calculateTotals();
        document.getElementById('poItemsTable').innerHTML = this.renderItemsTable();
    },

    calculateTotals() {
        let subtotal = 0, gstTotal = 0;
        this.selectedProducts.forEach(item => {
            subtotal += item.amount;
            gstTotal += item.gstAmount;
        });
        this.orderTotals = { subtotal, gstTotal, grandTotal: subtotal + gstTotal };
    },

    renderItemsTable() {
        if (this.selectedProducts.size === 0) {
            return `<div class="empty-state" style="padding: 2rem;"><p style="color: var(--text-muted);">No products added yet. Add products above.</p></div>`;
        }

        let rows = '';
        this.selectedProducts.forEach((item, key) => {
            rows += `
                <tr>
                    <td style="font-weight: 500;">${item.productName}</td>
                    <td>${item.weight || '-'}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">₹${item.rate.toFixed(2)}</td>
                    <td style="text-align: right;">₹${item.amount.toFixed(2)}</td>
                    <td style="text-align: center;">${item.gstRate}%</td>
                    <td style="text-align: right;">₹${item.gstAmount.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600;">₹${item.totalAmount.toFixed(2)}</td>
                    <td style="text-align: center;"><button class="btn btn-secondary" onclick="Purchase.removeProduct('${key}')">🗑️</button></td>
                </tr>
            `;
        });

        return `
            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Weight</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Rate</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: center;">GST %</th>
                        <th style="text-align: right;">GST Amt</th>
                        <th style="text-align: right;">Total</th>
                        <th style="text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot style="background: var(--bg-surface); font-weight: 600;">
                    <tr>
                        <td colspan="4" style="text-align: right;">Subtotal:</td>
                        <td style="text-align: right;">₹${this.orderTotals.subtotal.toFixed(2)}</td>
                        <td></td>
                        <td style="text-align: right;">₹${this.orderTotals.gstTotal.toFixed(2)}</td>
                        <td style="text-align: right; font-size: 1.1rem; color: var(--primary);">₹${this.orderTotals.grandTotal.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
    },

    cancelForm() {
        this.viewMode = 'list';
        this.selectedProducts.clear();
        this.render();
    },

    async savePurchaseOrder() {
        const supplierSelect = document.getElementById('supplierSelect');
        const option = supplierSelect.selectedOptions[0];

        if (!option || !option.value) {
            UI.showToast('Please select a vendor', 'error');
            return;
        }

        if (this.selectedProducts.size === 0) {
            UI.showToast('Please add at least one product', 'error');
            return;
        }

        // Get payment details
        const paymentStatus = document.getElementById('paymentStatus').value;
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
        const paymentDate = document.getElementById('paymentDate').value;

        const orderData = {
            orderNo: document.getElementById('poNumber').value,
            orderDate: document.getElementById('poDate').value,
            supplierId: parseInt(option.value),
            supplierName: option.dataset.name,
            expectedDeliveryDate: document.getElementById('expectedDelivery').value,
            subtotal: this.orderTotals.subtotal,
            gstTotal: this.orderTotals.gstTotal,
            grandTotal: this.orderTotals.grandTotal,
            paymentStatus,
            paymentAmount,
            paymentDate,
            items: Array.from(this.selectedProducts.values())
        };

        try {
            const response = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) throw new Error('Save failed');

            UI.showToast('✅ Purchase order created successfully!', 'success');
            this.cancelForm();
        } catch (error) {
            console.error('Error saving purchase order:', error);
            UI.showToast('Error saving purchase order', 'error');
        }
    },

    async viewOrder(id) {
        // Simple alert for now - can be expanded to full view
        const order = this.currentOrders.find(o => o.id === id);
        if (order) {
            alert(`PO: ${order.orderNo}\nSupplier: ${order.supplierName}\nTotal: ₹${order.grandTotal}\nStatus: ${order.status}`);
        }
    },

    async receiveOrder(id) {
        if (!confirm('Mark this order as received?')) return;

        try {
            const response = await fetch(`/api/purchase-orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'received', receivedDate: new Date().toISOString().split('T')[0] })
            });

            if (!response.ok) throw new Error('Update failed');
            UI.showToast('Order marked as received', 'success');
            this.render();
        } catch (error) {
            UI.showToast('Error updating order', 'error');
        }
    },

    async deleteOrder(id) {
        if (!confirm('Delete this purchase order?')) return;

        try {
            const response = await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            UI.showToast('Purchase order deleted', 'success');
            this.render();
        } catch (error) {
            UI.showToast('Error deleting order', 'error');
        }
    }
};
