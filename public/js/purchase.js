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
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #d62728; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
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
                <!-- Tableau-style Purchase Orders -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #d62728;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">📥</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Purchase Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Procurement and supplier orders</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="pur-tab-btn ${this.viewMode === 'list' ? 'active' : ''}" onclick="Purchase.showList()">📋 List</button>
                            <button class="pur-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" onclick="Purchase.showNewOrder()" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">➕ New Order</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Orders', totalOrders.toString(), 'In system', '#059669', '📜')}
                        ${this.renderKPI('Pending', pendingOrders.toString(), 'Awaiting delivery', '#ff7f0e', '⏳')}
                        ${this.renderKPI('Total Value', Utils.formatCurrency(totalValue), 'All time procurement', '#2ca02c', '💰')}
                    </div>

                    <!-- Main Content -->
                    <div id="purchaseContent">
                        ${this.viewMode === 'list' ? this.renderOrdersList() : this.renderForm()}
                    </div>
                </div>

                <style>
                    .pur-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .pur-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .pur-tab-btn.active {
                        background: #d62728;
                        border-color: #d62728;
                        color: white;
                    }
                </style>
            `;

        } catch (error) {
            console.error('Purchase render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading purchase orders: ${error.message}</p>
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

    showList() {
        this.viewMode = 'list';
        this.render();
    },

    renderOrdersList() {
        if (this.currentOrders.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666; background: white;">No purchase orders found. Click "New Order" to get started!</div>';
        }

        const statusColors = {
            'pending': { bg: '#fff4ce', text: '#997600' },
            'received': { bg: '#dff6dd', text: '#107c10' },
            'partial': { bg: '#fff4ce', text: '#997600' },
            'cancelled': { bg: '#fde7e9', text: '#d13438' }
        };

        return `
            <div style="background: white; min-height: 400px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Purchase Orders (${this.currentOrders.length})</span>
                    <input type="text" id="purSearchInput" placeholder="Search orders..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background: #1e40af; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">PO Number</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">Date</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">Vendor</th>
                                <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: white;">Total</th>
                                <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: white;">Status</th>
                                <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: white;">Payment</th>
                                <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: white;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.currentOrders.map((o, idx) => {
            const sc = statusColors[o.status] || { bg: '#f3f2f1', text: '#605e5c' };
            const paymentColors = {
                'paid': { bg: '#dcfce7', text: '#166534', label: '✅ PAID' },
                'partial': { bg: '#fef3c7', text: '#92400e', label: '⏳ PARTIAL' },
                'unpaid': { bg: '#fee2e2', text: '#991b1b', label: '❌ UNPAID' }
            };
            const pc = paymentColors[o.paymentStatus] || paymentColors['unpaid'];
            return `
                                <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                    <td style="padding: 8px 12px; color: #059669; font-weight: 600;">${o.orderNo}</td>
                                    <td style="padding: 8px 12px; color: #666;">${o.orderDate || '-'}</td>
                                    <td style="padding: 8px 12px; font-weight: 500; color: #333;">${o.supplierName || '-'}</td>
                                    <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #333;">${Utils.formatCurrency(parseFloat(o.grandTotal || 0))}</td>
                                    <td style="padding: 8px 12px; text-align: center;">
                                        <span style="background: ${sc.bg}; color: ${sc.text}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                            ${(o.status || 'pending').toUpperCase()}
                                        </span>
                                    </td>
                                    <td style="padding: 8px 12px; text-align: center;">
                                        <span style="background: ${pc.bg}; color: ${pc.text}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                            ${pc.label}
                                        </span>
                                    </td>
                                    <td style="padding: 8px 12px; text-align: center;">
                                        <button onclick="Purchase.viewOrder(${o.id})" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 4px;">👁️</button>
                                        ${o.status === 'pending' ? `<button onclick="Purchase.receiveOrder(${o.id})" style="background: #dff6dd; border: 1px solid #c3e6cb; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #107c10; margin-right: 4px;">📦</button>` : ''}
                                        <button onclick="Purchase.deleteOrder(${o.id})" style="background: #fde7e9; border: 1px solid #f3d6d8; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #d13438;">🗑️</button>
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
        switch (status) {
            case 'pending': return { bg: '#fef3c7', text: '#92400e' };
            case 'received': return { bg: '#dcfce7', text: '#166534' };
            case 'partial': return { bg: '#dbeafe', text: '#1e40af' };
            case 'cancelled': return { bg: '#fee2e2', text: '#991b1b' };
            default: return { bg: '#f1f5f9', text: '#475569' };
        }
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
                    <h1 class="page-title">📝 New Purchase Order</h1>
                    <p class="page-subtitle">Create a new purchase order for vendor</p>
                </div>
                <button class="btn btn-secondary" onclick="Purchase.cancelForm()">← Back to List</button>
            </div>

            <div class="card">
                <div class="card-header" style="background: #dc2626; color: white;">
                    <h2 class="card-title" style="color: white;">📋 Order Details</h2>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                        <div class="form-group">
                            <label class="form-label">PO Number</label>
                            <input type="text" id="poNumber" class="form-input" value="${this.nextPoNo || ''}" readonly style="background: #f1f5f9; font-weight: 600;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Order Date *</label>
                            <input type="date" id="poDate" class="form-input" value="${today}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Vendor/Supplier *</label>
                            <select id="supplierSelect" class="form-input" required>
                                <option value="">Select Vendor</option>
                                ${this.currentSuppliers.map(s => `
                                    <option value="${s.id}" data-name="${s.supplierName}">${s.supplierCode} - ${s.supplierName}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Expected Delivery</label>
                            <input type="date" id="expectedDelivery" class="form-input">
                        </div>
                    </div>
                    
                    <!-- Payment Section -->
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                        <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #059669;">💰 Payment Details</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Payment Status</label>
                                <select id="paymentStatus" class="form-input">
                                    <option value="unpaid">❌ Unpaid</option>
                                    <option value="partial">⏳ Partial</option>
                                    <option value="paid">✅ Paid</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Amount (₹)</label>
                                <input type="number" id="paymentAmount" class="form-input" placeholder="0.00" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Date</label>
                                <input type="date" id="paymentDate" class="form-input">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header" style="background: #059669; color: white;">
                    <h2 class="card-title" style="color: white;">📦 Add Products</h2>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 1rem; align-items: end;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Product Name *</label>
                            <input type="text" id="productName" class="form-input" placeholder="Type product name (e.g., Salt, Sugar, Dal)">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Weight/Unit</label>
                            <input type="text" id="productWeight" class="form-input" placeholder="e.g., 10 KG, 5 L">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Quantity *</label>
                            <input type="number" id="productQty" class="form-input" value="1" min="1">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Rate (₹) *</label>
                            <input type="number" id="productRate" class="form-input" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">GST %</label>
                            <input type="number" id="productGst" class="form-input" value="5" step="0.5">
                        </div>
                        <button class="btn btn-success" onclick="Purchase.addProduct()" style="margin-bottom: 0; height: 36px;">➕ Add</button>
                    </div>
                    <p style="font-size: 11px; color: #6b7280; margin-top: 8px;">💡 Tip: Type product name directly (no need to select from existing products)</p>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h2 class="card-title">🧾 Order Items</h2>
                </div>
                <div class="card-body" style="padding: 0;">
                    <div id="poItemsTable">
                        ${this.renderItemsTable()}
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="Purchase.savePurchaseOrder()" style="background: #059669;">💾 Save Purchase Order</button>
                <button class="btn btn-secondary" onclick="Purchase.cancelForm()">Cancel</button>
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
            return `<div class="empty-state" style="padding: 2rem;"><p style="color: #64748b;">No products added yet. Add products above.</p></div>`;
        }

        let rows = '';
        this.selectedProducts.forEach((item, key) => {
            rows += `
                <tr>
                    <td style="font-weight: 500;">${item.productName}</td>
                    <td>${item.weight || '-'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">₹${item.rate.toFixed(2)}</td>
                    <td class="text-right">₹${item.amount.toFixed(2)}</td>
                    <td class="text-center">${item.gstRate}%</td>
                    <td class="text-right">₹${item.gstAmount.toFixed(2)}</td>
                    <td class="text-right" style="font-weight: 600;">₹${item.totalAmount.toFixed(2)}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="Purchase.removeProduct('${key}')">🗑️</button></td>
                </tr>
            `;
        });

        return `
            <table class="table">
                <thead style="background: #1e40af; color: white;">
                    <tr>
                        <th style="color: white;">Product</th>
                        <th style="color: white;">Weight</th>
                        <th style="text-align: center; color: white;">Qty</th>
                        <th style="text-align: right; color: white;">Rate</th>
                        <th style="text-align: right; color: white;">Amount</th>
                        <th style="text-align: center; color: white;">GST %</th>
                        <th style="text-align: right; color: white;">GST Amt</th>
                        <th style="text-align: right; color: white;">Total</th>
                        <th style="color: white;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
                <tfoot style="background: #dcfce7; font-weight: 600;">
                    <tr>
                        <td colspan="4" style="text-align: right;">Subtotal:</td>
                        <td style="text-align: right;">₹${this.orderTotals.subtotal.toFixed(2)}</td>
                        <td></td>
                        <td style="text-align: right;">₹${this.orderTotals.gstTotal.toFixed(2)}</td>
                        <td style="text-align: right; font-size: 1rem; color: #059669;">₹${this.orderTotals.grandTotal.toFixed(2)}</td>
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
