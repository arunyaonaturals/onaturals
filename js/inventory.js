// ================================
// Inventory Module - Batch-Based Stock Management
// ================================

const Inventory = {
    products: [],
    batches: [],
    stockSummary: [],
    lowStockItems: [],
    selectedTab: 'stock', // 'stock', 'batches', 'create'
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #9467bd; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            // Fetch all data
            const [productsRes, batchesRes, stockRes, lowStockRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/product-batches'),
                fetch('/api/product-batches/stock-summary'),
                fetch('/api/product-batches/low-stock?threshold=10')
            ]);

            this.products = await productsRes.json();
            this.batches = await batchesRes.json();
            this.stockSummary = await stockRes.json();
            this.lowStockItems = await lowStockRes.json();

            const stats = this.calculateStats();

            contentArea.innerHTML = `
                <!-- Tableau-style Inventory Dashboard -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #9467bd;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">📦</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Inventory Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Batch-based stock tracking</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="inv-tab-btn ${this.selectedTab === 'stock' ? 'active' : ''}" data-tab="stock">📊 Stock Levels</button>
                            <button class="inv-tab-btn ${this.selectedTab === 'batches' ? 'active' : ''}" data-tab="batches">📋 Batches</button>
                            <button class="inv-tab-btn ${this.selectedTab === 'create' ? 'active' : ''}" data-tab="create" style="background: #9467bd; border-color: #9467bd;">➕ Create Batch</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Products', this.products.length.toString(), 'In catalog', '#1f77b4', '📦')}
                        ${this.renderKPI('Active Batches', stats.activeBatches.toString(), 'With stock', '#2ca02c', '📋')}
                        ${this.renderKPI('Total Stock', stats.totalStock.toString(), 'Units available', '#9467bd', '📊')}
                        ${this.renderKPI('Low Stock', this.lowStockItems.length.toString(), 'Need reorder', '#ff7f0e', '⚠️')}
                        ${this.renderKPI('Out of Stock', stats.outOfStock.toString(), 'Zero stock', '#d62728', '🚨')}
                    </div>

                    <!-- Main Content -->
                    <div id="inventoryTabContent">
                        ${this.renderTabContent()}
                    </div>
                </div>

                <style>
                    .inv-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .inv-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .inv-tab-btn.active {
                        background: #1f77b4;
                        border-color: #1f77b4;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Inventory render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading inventory: ${error.message}</p>
                </div>
            `;
        }
    },

    calculateStats() {
        const activeBatches = this.batches.filter(b => b.remainingQty > 0).length;
        const totalStock = this.batches.reduce((sum, b) => sum + (b.remainingQty || 0), 0);
        const outOfStock = this.stockSummary.filter(s => s.totalStock === 0).length;

        return { activeBatches, totalStock, outOfStock };
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

    renderTabContent() {
        switch (this.selectedTab) {
            case 'batches':
                return this.renderBatchesTab();
            case 'create':
                return this.renderCreateBatchTab();
            default:
                return this.renderStockTab();
        }
    },

    renderStockTab() {
        return `
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0;">
                <!-- Left: Stock Table -->
                <div style="border-right: 1px solid #ddd;">
                    <div style="background: white; min-height: 400px;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 13px; font-weight: 600; color: #333;">📊 Stock Levels by Product</span>
                            <input type="text" id="stockSearch" placeholder="Search products..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 200px;">
                        </div>
                        <div style="max-height: 500px; overflow-y: auto;">
                            ${this.renderStockTable()}
                        </div>
                    </div>
                </div>

                <!-- Right: Low Stock Alerts -->
                <div>
                    <div style="background: white; border-bottom: 1px solid #ddd;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #fff4ce;">
                            <span style="font-size: 13px; font-weight: 600; color: #835c00;">⚠️ Low Stock Alerts (< 10 units)</span>
                        </div>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${this.renderLowStockList()}
                        </div>
                    </div>

                    <div style="background: white;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                            <span style="font-size: 13px; font-weight: 600; color: #333;">📈 Stock by Category</span>
                        </div>
                        <div style="max-height: 250px; overflow-y: auto;">
                            ${this.renderCategorySummary()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderStockTable() {
        if (this.stockSummary.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No products found. Add products first.</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Product</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Category</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Batches</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Total Stock</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.stockSummary.map((item, idx) => {
            const status = this.getStockStatus(item.totalStock);
            return `
                            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};" class="stock-row">
                                <td style="padding: 8px 12px; font-weight: 500; color: #333;">${item.productName}</td>
                                <td style="padding: 8px 12px; color: #666;">${item.category || 'Uncategorized'}</td>
                                <td style="padding: 8px 12px; text-align: right; color: #1f77b4;">${item.batchCount}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${status.valueColor};">${item.totalStock}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; background: ${status.bg}; color: ${status.color};">${status.label}</span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    renderLowStockList() {
        if (this.lowStockItems.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #2ca02c; font-size: 12px;">✅ All products have sufficient stock</div>';
        }

        return this.lowStockItems.map((item, idx) => `
            <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: ${item.totalStock === 0 ? '#fde7e9' : '#fff'};">
                <div>
                    <div style="font-size: 12px; font-weight: 500; color: #333;">${item.productName}</div>
                    <div style="font-size: 10px; color: #888;">${item.category || 'Uncategorized'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 700; color: ${item.totalStock === 0 ? '#d13438' : '#ff7f0e'};">${item.totalStock}</div>
                    <div style="font-size: 10px; color: #888;">units</div>
                </div>
            </div>
        `).join('');
    },

    renderCategorySummary() {
        const categories = {};
        this.stockSummary.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!categories[cat]) {
                categories[cat] = { count: 0, totalStock: 0 };
            }
            categories[cat].count++;
            categories[cat].totalStock += item.totalStock;
        });

        const catArray = Object.entries(categories).sort((a, b) => b[1].totalStock - a[1].totalStock);
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

        return catArray.map(([cat, data], idx) => `
            <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: ${colors[idx % colors.length]}; border-radius: 50%;"></div>
                    <span style="font-size: 12px; color: #333;">${cat}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; font-weight: 600; color: ${colors[idx % colors.length]};">${data.totalStock} units</div>
                    <div style="font-size: 10px; color: #888;">${data.count} products</div>
                </div>
            </div>
        `).join('');
    },

    renderBatchesTab() {
        return `
            <div style="background: white; min-height: 400px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Product Batches</span>
                    <input type="text" id="batchSearch" placeholder="Search batches..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;">
                    ${this.renderBatchTable()}
                </div>
            </div>
        `;
    },

    renderBatchTable() {
        if (this.batches.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No batches created yet. Click "Create Batch" to add stock from purchases.</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Batch #</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Product</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Size</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Initial</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Remaining</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Received</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #9467bd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.batches.map((batch, idx) => `
                        <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};" class="batch-row">
                            <td style="padding: 8px 12px; font-weight: 500; color: #9467bd;">${batch.batchNumber}</td>
                            <td style="padding: 8px 12px; color: #333;">${batch.productName || 'Unknown'}</td>
                            <td style="padding: 8px 12px; color: #666;">${batch.packageSize || '-'}</td>
                            <td style="padding: 8px 12px; text-align: right; color: #666;">${batch.quantity}</td>
                            <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${batch.remainingQty > 0 ? '#2ca02c' : '#d62728'};">${batch.remainingQty}</td>
                            <td style="padding: 8px 12px; color: #666;">${batch.receivedDate || '-'}</td>
                            <td style="padding: 8px 12px; text-align: center;">
                                <button class="adjust-batch-btn" data-batch-id="${batch.id}" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">Adjust</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderCreateBatchTab() {
        return `
            <div style="background: white; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #333; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">📦</span> Create New Product Batch
                </h3>
                <p style="color: #666; font-size: 12px; margin-bottom: 20px;">
                    Create a batch for products manufactured/packed.
                </p>
                
                <form id="createBatchForm">
                    <div style="display: grid; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Product *</label>
                            <select id="batchProductId" class="form-select" style="width: 100%;" required>
                                <option value="">Select Product</option>
                                ${this.products.map(p => `<option value="${p.id}">${p.productName} (${p.weight || 'No size'})</option>`).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Quantity (pieces) *</label>
                            <input type="number" id="batchQuantity" class="form-input" min="1" required placeholder="Number of pieces">
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Batch Number *</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="batchNumber" class="form-input" style="flex: 1;" required placeholder="Auto-generated or custom">
                                <button type="button" id="generateBatchNo" style="background: #9467bd; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Generate</button>
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Packed Date</label>
                            <input type="date" id="batchReceivedDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                        </div>

                        <div style="padding-top: 16px; border-top: 1px solid #eee;">
                            <button type="submit" style="background: #2ca02c; color: white; border: none; padding: 10px 24px; border-radius: 4px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                <span>📦</span> Create Batch
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    },

    getStockStatus(qty) {
        if (qty <= 0) return { label: 'OUT', bg: '#fde7e9', color: '#d13438', valueColor: '#d13438' };
        if (qty < 10) return { label: 'LOW', bg: '#fff4ce', color: '#835c00', valueColor: '#ff7f0e' };
        return { label: 'OK', bg: '#dff6dd', color: '#107c10', valueColor: '#2ca02c' };
    },

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.inv-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedTab = e.target.dataset.tab;
                document.getElementById('inventoryTabContent').innerHTML = this.renderTabContent();

                // Update active state
                document.querySelectorAll('.inv-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.attachTabEventListeners();
            });
        });

        this.attachTabEventListeners();
    },

    attachTabEventListeners() {
        // Search functionality
        document.getElementById('stockSearch')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.stock-row').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        document.getElementById('batchSearch')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.batch-row').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        // Generate batch number
        document.getElementById('generateBatchNo')?.addEventListener('click', async () => {
            const productId = document.getElementById('batchProductId').value;

            if (!productId) {
                UI.showToast('Please select a product first', 'warning');
                return;
            }

            try {
                const res = await fetch(`/api/product-batches/generate-batch-number/${productId}`);
                const data = await res.json();
                document.getElementById('batchNumber').value = data.batchNumber;
            } catch (error) {
                UI.showToast('Error generating batch number', 'error');
            }
        });

        // Create batch form
        document.getElementById('createBatchForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                productId: parseInt(document.getElementById('batchProductId').value),
                batchNumber: document.getElementById('batchNumber').value,
                quantity: parseInt(document.getElementById('batchQuantity').value),
                receivedDate: document.getElementById('batchReceivedDate').value
            };

            if (!data.productId || !data.batchNumber || !data.quantity) {
                UI.showToast('Please fill in all required fields', 'error');
                return;
            }

            try {
                const res = await fetch('/api/product-batches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (res.ok) {
                    UI.showToast('✅ Batch created successfully!', 'success');
                    this.selectedTab = 'batches';
                    this.render();
                } else {
                    UI.showToast(result.error || 'Error creating batch', 'error');
                }
            } catch (error) {
                UI.showToast('Error creating batch: ' + error.message, 'error');
            }
        });

        // Adjust batch buttons
        document.querySelectorAll('.adjust-batch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const batchId = parseInt(e.target.dataset.batchId);
                this.showAdjustBatchModal(batchId);
            });
        });
    },

    showAdjustBatchModal(batchId) {
        const batch = this.batches.find(b => b.id === batchId);
        if (!batch) return;

        const content = `
            <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 4px;">
                <div style="font-weight: 600; color: #9467bd;">${batch.batchNumber}</div>
                <div style="font-size: 12px; color: #333; margin-top: 4px;">${batch.productName}</div>
                <div style="font-size: 11px; color: #666; margin-top: 2px;">Current: ${batch.remainingQty} / ${batch.quantity} pieces</div>
            </div>
            <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">New Remaining Quantity</label>
                <input type="number" id="newRemainingQty" class="form-input" value="${batch.remainingQty}" min="0" max="${batch.quantity}">
            </div>
            <div style="margin-top: 12px;">
                <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Notes</label>
                <input type="text" id="adjustNotes" class="form-input" placeholder="Reason for adjustment...">
            </div>
        `;

        UI.createModal('Adjust Batch Stock', content, [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: 'Update', type: 'primary', action: 'update' }
        ]);

        document.querySelector('[data-action="update"]')?.addEventListener('click', async () => {
            const newQty = parseInt(document.getElementById('newRemainingQty').value);
            const notes = document.getElementById('adjustNotes').value;

            try {
                const res = await fetch(`/api/product-batches/${batchId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ remainingQty: newQty, notes })
                });

                if (res.ok) {
                    UI.showToast('Batch updated successfully', 'success');
                    UI.closeModal();
                    this.render();
                } else {
                    UI.showToast('Error updating batch', 'error');
                }
            } catch (error) {
                UI.showToast('Error: ' + error.message, 'error');
            }
        });
    }
};
