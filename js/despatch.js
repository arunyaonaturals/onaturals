// ================================
// Despatch Module - Delivery & Dispatch Tracking
// ================================

const Despatch = {
    orders: [],
    summary: {},
    captainStats: [],
    selectedStatus: 'all',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #ff7f0e; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            // Fetch delivery data
            const [ordersRes, summaryRes, captainRes] = await Promise.all([
                fetch('/api/order-delivery'),
                fetch('/api/order-delivery/summary'),
                fetch('/api/order-delivery/captain-stats')
            ]);

            const ordersData = await ordersRes.json();
            const summaryData = await summaryRes.json();
            const captainData = await captainRes.json();

            // Ensure arrays are always arrays
            this.orders = Array.isArray(ordersData) ? ordersData : [];
            this.summary = summaryData || {};
            this.captainStats = Array.isArray(captainData) ? captainData : [];

            // Filter orders by status
            const filteredOrders = this.filterOrders();

            contentArea.innerHTML = `
                <!-- Tableau-style Despatch Dashboard -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ff7f0e;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">🚚</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Despatch Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Track deliveries and dispatch status</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="despatch-filter-btn ${this.selectedStatus === 'all' ? 'active' : ''}" data-status="all">All (${this.summary.total || 0})</button>
                            <button class="despatch-filter-btn ${this.selectedStatus === 'pending' ? 'active' : ''}" data-status="pending" style="border-color: #ff7f0e;">⏳ Pending (${this.summary.pending || 0})</button>
                            <button class="despatch-filter-btn ${this.selectedStatus === 'partial' ? 'active' : ''}" data-status="partial" style="border-color: #9467bd;">📦 Partial (${this.summary.partial || 0})</button>
                            <button class="despatch-filter-btn ${this.selectedStatus === 'delivered' ? 'active' : ''}" data-status="delivered" style="border-color: #2ca02c;">✅ Delivered (${this.summary.delivered || 0})</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Orders', (this.summary.total || 0).toString(), 'All invoices', '#3182ce', '📋')}
                        ${this.renderKPI('Pending', (this.summary.pending || 0).toString(), 'Not yet dispatched', '#ff7f0e', '⏳')}
                        ${this.renderKPI('Partial', (this.summary.partial || 0).toString(), 'Partially delivered', '#9467bd', '📦')}
                        ${this.renderKPI('Delivered', (this.summary.delivered || 0).toString(), 'Fully delivered', '#2ca02c', '✅')}
                    </div>

                    <!-- Main Content -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0;">
                        <!-- Left Panel - Order List -->
                        <div style="border-right: 1px solid #ddd;">
                            <div style="background: white; min-height: 400px;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Dispatch Queue - ${this.getStatusLabel()}</span>
                                    <input type="text" id="despatchSearch" placeholder="Search by invoice, store..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                                </div>
                                <div style="max-height: 550px; overflow-y: auto;">
                                    ${this.renderOrderTable(filteredOrders)}
                                </div>
                            </div>
                        </div>

                        <!-- Right Panel - Stats -->
                        <div>
                            <!-- Sales Captain Performance -->
                            <div style="background: white; border-bottom: 1px solid #ddd;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">👤 Sales Captain Performance</span>
                                </div>
                                <div style="max-height: 300px; overflow-y: auto;">
                                    ${this.renderCaptainStats()}
                                </div>
                            </div>

                            <!-- Status Breakdown -->
                            <div style="background: white; border-bottom: 1px solid #ddd;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">📊 Delivery Status</span>
                                </div>
                                <div style="padding: 16px;">
                                    ${this.renderStatusChart()}
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div style="background: white;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">⚡ Quick Actions</span>
                                </div>
                                <div style="padding: 12px 16px;">
                                    <button id="initAllDeliveries" style="width: 100%; background: #3182ce; color: white; border: none; padding: 10px; border-radius: 4px; margin-bottom: 8px; cursor: pointer; font-size: 12px;">
                                        🔄 Initialize All Pending Deliveries
                                    </button>
                                    <button id="viewLowStock" style="width: 100%; background: #ff7f0e; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        ⚠️ View Low Stock Items
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .despatch-filter-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .despatch-filter-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .despatch-filter-btn.active {
                        background: #ff7f0e;
                        border-color: #ff7f0e;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Despatch render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading despatch data: ${error.message}</p>
                </div>
            `;
        }
    },

    filterOrders() {
        if (this.selectedStatus === 'all') return this.orders;
        return this.orders.filter(o => (o.deliveryStatus || 'pending') === this.selectedStatus);
    },

    getStatusLabel() {
        const labels = {
            all: 'All Orders',
            pending: 'Pending Delivery',
            partial: 'Partially Delivered',
            delivered: 'Fully Delivered'
        };
        return labels[this.selectedStatus] || 'All Orders';
    },

    renderKPI(label, value, subtitle, color, icon) {
        return `
            <div style="background: white; padding: 16px 20px; border-right: 1px solid #ddd; position: relative; cursor: pointer;" class="kpi-card" data-status="${label.toLowerCase()}">
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${color};"></div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                    <div>
                        <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">${label}</div>
                        <div style="font-size: 24px; font-weight: 700; color: #333;">${value}</div>
                        <div style="font-size: 10px; color: #888; margin-top: 3px;">${subtitle}</div>
                    </div>
                    <div style="font-size: 24px; opacity: 0.3;">${icon}</div>
                </div>
            </div>
        `;
    },

    renderOrderTable(orders) {
        if (orders.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No orders found for this status.</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Invoice</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Date</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Store</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Captain</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Amount</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Status</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #ff7f0e;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map((order, idx) => {
            const statusStyle = this.getStatusStyle(order.deliveryStatus || 'pending');
            return `
                            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};" class="order-row">
                                <td style="padding: 8px 12px; font-weight: 500; color: #3182ce;">${order.invoiceNo}</td>
                                <td style="padding: 8px 12px; color: #666;">${order.orderDate || '-'}</td>
                                <td style="padding: 8px 12px; color: #333;">${order.storeName || '-'}</td>
                                <td style="padding: 8px 12px; color: #666;">${order.salesmanName || '-'}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #2ca02c;">${Utils.formatCurrency(order.grandTotal)}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; background: ${statusStyle.bg}; color: ${statusStyle.color};">${statusStyle.label}</span>
                                </td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <button class="deliver-btn" data-order-id="${order.id}" style="background: ${(order.deliveryStatus || 'pending') === 'delivered' ? '#f3f2f1' : '#ff7f0e'}; color: ${(order.deliveryStatus || 'pending') === 'delivered' ? '#666' : 'white'}; border: none; padding: 4px 10px; border-radius: 3px; font-size: 10px; cursor: pointer;">
                                        ${(order.deliveryStatus || 'pending') === 'delivered' ? 'View' : '📦 Deliver'}
                                    </button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    getStatusStyle(status) {
        switch (status) {
            case 'pending': return { label: 'Pending', bg: '#fff4ce', color: '#835c00' };
            case 'partial': return { label: 'Partial', bg: '#e6d5f5', color: '#7b3fa0' };
            case 'delivered': return { label: 'Delivered', bg: '#dff6dd', color: '#107c10' };
            default: return { label: 'Unknown', bg: '#f3f2f1', color: '#605e5c' };
        }
    },

    renderCaptainStats() {
        if (this.captainStats.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">No captain data available</div>';
        }

        return this.captainStats.map((captain, idx) => {
            const total = captain.totalOrders || 1;
            const deliveryRate = Math.round((captain.delivered || 0) / total * 100);
            const colors = ['#3182ce', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

            return `
                <div style="padding: 10px 16px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 500; color: #333;">${captain.captain || 'Unknown'}</span>
                        <span style="font-size: 11px; font-weight: 600; color: ${deliveryRate >= 70 ? '#2ca02c' : '#ff7f0e'};">${deliveryRate}%</span>
                    </div>
                    <div style="display: flex; gap: 4px; height: 16px; border-radius: 2px; overflow: hidden; background: #e8e8e8;">
                        <div style="width: ${(captain.delivered / total * 100)}%; background: #2ca02c;" title="Delivered: ${captain.delivered}"></div>
                        <div style="width: ${(captain.partial / total * 100)}%; background: #9467bd;" title="Partial: ${captain.partial}"></div>
                        <div style="width: ${(captain.pending / total * 100)}%; background: #ff7f0e;" title="Pending: ${captain.pending}"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: #888;">
                        <span>✅ ${captain.delivered || 0}</span>
                        <span>📦 ${captain.partial || 0}</span>
                        <span>⏳ ${captain.pending || 0}</span>
                        <span>Total: ${captain.totalOrders}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderStatusChart() {
        const total = this.summary.total || 1;
        const delivered = this.summary.delivered || 0;
        const partial = this.summary.partial || 0;
        const pending = this.summary.pending || 0;

        return `
            <div style="display: flex; gap: 4px; height: 24px; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                <div style="width: ${(delivered / total * 100)}%; background: #2ca02c; min-width: ${delivered > 0 ? '20px' : '0'};" title="Delivered"></div>
                <div style="width: ${(partial / total * 100)}%; background: #9467bd; min-width: ${partial > 0 ? '20px' : '0'};" title="Partial"></div>
                <div style="width: ${(pending / total * 100)}%; background: #ff7f0e; min-width: ${pending > 0 ? '20px' : '0'};" title="Pending"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 10px; height: 10px; background: #2ca02c; border-radius: 2px;"></div>
                    <span>Delivered (${Math.round(delivered / total * 100)}%)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 10px; height: 10px; background: #9467bd; border-radius: 2px;"></div>
                    <span>Partial (${Math.round(partial / total * 100)}%)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 10px; height: 10px; background: #ff7f0e; border-radius: 2px;"></div>
                    <span>Pending (${Math.round(pending / total * 100)}%)</span>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        // Status filter buttons
        document.querySelectorAll('.despatch-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedStatus = e.target.dataset.status;
                this.render();
            });
        });

        // Search
        document.getElementById('despatchSearch')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.order-row').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        // Deliver buttons
        document.querySelectorAll('.deliver-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = parseInt(e.target.dataset.orderId);
                await this.showDeliveryModal(orderId);
            });
        });

        // Initialize all deliveries
        document.getElementById('initAllDeliveries')?.addEventListener('click', async () => {
            if (!confirm('This will initialize delivery tracking for all pending orders. Continue?')) return;

            const pendingOrders = this.orders.filter(o => !o.deliveryStatus || o.deliveryStatus === 'pending');
            let count = 0;

            for (const order of pendingOrders) {
                try {
                    await fetch(`/api/order-delivery/${order.id}/init`, { method: 'POST' });
                    count++;
                } catch (error) {
                    console.error('Error initializing order:', order.id, error);
                }
            }

            UI.showToast(`Initialized ${count} orders for delivery tracking`, 'success');
            this.render();
        });

        // View low stock
        document.getElementById('viewLowStock')?.addEventListener('click', () => {
            window.location.hash = 'inventory';
            if (window.App) App.navigateTo('inventory');
        });
    },

    async showDeliveryModal(orderId) {
        try {
            const res = await fetch(`/api/order-delivery/${orderId}`);
            const data = await res.json();

            const { order, deliveryStatus, items } = data;

            const content = `
                <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #3182ce;">${order.invoiceNo}</div>
                            <div style="font-size: 12px; color: #333; margin-top: 2px;">${order.storeName}</div>
                        </div>
                        <span style="padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${this.getStatusStyle(deliveryStatus.status || 'pending').bg}; color: ${this.getStatusStyle(deliveryStatus.status || 'pending').color};">
                            ${this.getStatusStyle(deliveryStatus.status || 'pending').label}
                        </span>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">Order Items</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead style="background: #f8f9fa;">
                            <tr>
                                <th style="padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd;">Product</th>
                                <th style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #ddd;">Ordered</th>
                                <th style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #ddd;">Delivered</th>
                                <th style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #ddd;">Pending</th>
                                <th style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #ddd;">Stock</th>
                                <th style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #ddd;">Deliver Now</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td style="padding: 6px 8px; color: #333;">${item.productName}</td>
                                    <td style="padding: 6px 8px; text-align: right;">${item.orderedQty}</td>
                                    <td style="padding: 6px 8px; text-align: right; color: #2ca02c;">${item.deliveredQty || 0}</td>
                                    <td style="padding: 6px 8px; text-align: right; color: #ff7f0e;">${item.pendingQty}</td>
                                    <td style="padding: 6px 8px; text-align: right; color: ${item.availableStock >= item.pendingQty ? '#2ca02c' : '#d62728'}; font-weight: 600;">
                                        ${item.availableStock} ${item.canDeliver ? '✓' : '⚠️'}
                                    </td>
                                    <td style="padding: 6px 8px; text-align: right;">
                                        <input type="number" class="deliver-qty-input" 
                                            data-product-id="${item.productId}" 
                                            min="0" max="${Math.min(item.pendingQty, item.availableStock)}" 
                                            value="${Math.min(item.pendingQty, item.availableStock)}"
                                            style="width: 60px; padding: 3px 6px; font-size: 11px; border: 1px solid #ddd; border-radius: 3px; text-align: right;"
                                            ${(item.pendingQty === 0 || item.availableStock === 0) ? 'disabled' : ''}>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div>
                    <label style="display: block; font-size: 11px; font-weight: 600; color: #333; margin-bottom: 4px;">Delivery Notes</label>
                    <input type="text" id="deliveryNotes" class="form-input" placeholder="Optional notes..." style="font-size: 12px;">
                </div>
            `;

            UI.createModal(`Deliver Order - ${order.invoiceNo}`, content, [
                { label: 'Cancel', type: 'secondary', action: 'close' },
                { label: '📦 Confirm Delivery', type: 'primary', action: 'deliver' }
            ]);

            document.querySelector('[data-action="deliver"]')?.addEventListener('click', async () => {
                const deliverItems = [];
                document.querySelectorAll('.deliver-qty-input').forEach(input => {
                    const qty = parseInt(input.value) || 0;
                    if (qty > 0) {
                        deliverItems.push({
                            productId: parseInt(input.dataset.productId),
                            deliverQty: qty
                        });
                    }
                });

                if (deliverItems.length === 0) {
                    UI.showToast('No items to deliver', 'warning');
                    return;
                }

                const notes = document.getElementById('deliveryNotes')?.value || '';

                try {
                    const res = await fetch(`/api/order-delivery/${orderId}/deliver`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            items: deliverItems,
                            salesCaptain: order.salesmanName,
                            notes
                        })
                    });

                    const result = await res.json();

                    if (res.ok) {
                        UI.showToast(`✅ Delivery recorded! Status: ${result.status}`, 'success');
                        UI.closeModal();
                        this.render();
                    } else {
                        UI.showToast(result.error || 'Error recording delivery', 'error');
                    }
                } catch (error) {
                    UI.showToast('Error: ' + error.message, 'error');
                }
            });

        } catch (error) {
            console.error('Error loading order details:', error);
            UI.showToast('Error loading order details', 'error');
        }
    }
};
