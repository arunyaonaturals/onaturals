// ================================
// Inventory Module - Batch-Based Stock Management
// ================================

const Inventory = {
    products: [],
    batches: [],
    stockSummary: [],
    lowStockItems: [],
    rawMaterials: [],
    productionBatches: [],
    selectedTab: 'stock', // 'stock', 'batches', 'create', 'raw-materials', 'production'
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 100px;">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // Fetch all data
            const [productsRes, batchesRes, stockRes, lowStockRes, rawMaterialsRes, productionBatchesRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/product-batches'),
                fetch('/api/product-batches/stock-summary'),
                fetch('/api/product-batches/low-stock?threshold=10'),
                fetch('/api/raw-materials'),
                fetch('/api/production-batches')
            ]);

            this.products = await productsRes.json();
            this.batches = await batchesRes.json();
            this.stockSummary = await stockRes.json();
            this.lowStockItems = await lowStockRes.json();
            this.rawMaterials = await rawMaterialsRes.json();
            this.productionBatches = await productionBatchesRes.json();

            const stats = this.calculateStats();

            contentArea.innerHTML = `
                <!-- Page Header -->
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div class="header-title-wrapper">
                        <h1>Inventory Management</h1>
                        <p>Batch-based stock tracking and production</p>
                    </div>
                    <div class="tab-nav">
                        <button class="tab-btn ${this.selectedTab === 'stock' ? 'active' : ''}" onclick="Inventory.switchTab('stock')">📊 Finished Stock</button>
                        <button class="tab-btn ${this.selectedTab === 'batches' ? 'active' : ''}" onclick="Inventory.switchTab('batches')">📋 Batches</button>
                        <button class="tab-btn ${this.selectedTab === 'raw-materials' ? 'active' : ''}" onclick="Inventory.switchTab('raw-materials')">🌾 Raw Materials</button>
                        <button class="tab-btn ${this.selectedTab === 'production' ? 'active' : ''}" onclick="Inventory.switchTab('production')">🏭 Production</button>
                    </div>
                </div>

                <!-- KPI Stats -->
                <div class="stats-grid">
                    ${this.renderKPI('Total Products', this.products.length.toString(), 'In catalog', 'blue', '📦')}
                    ${this.renderKPI('Active Batches', stats.activeBatches.toString(), 'With stock', 'green', '📋')}
                    ${this.renderKPI('Total Stock', stats.totalStock.toString(), 'Units available', 'orange', '📊')}
                    ${this.renderKPI('Low Stock', this.lowStockItems.length.toString(), 'Need reorder', 'red', '⚠️')}
                </div>

                <!-- Main Content -->
                <div id="inventoryTabContent">
                    ${this.renderTabContent()}
                </div>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Inventory render error:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p style="color: var(--danger);">Error loading inventory: ${error.message}</p>
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

    renderTabContent() {
        switch (this.selectedTab) {
            case 'raw-materials':
                return this.renderRawMaterialsTab();
            case 'production':
                return this.renderProductionTab();
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
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                <!-- Left: Stock Table -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Stock Levels by Product</h3>
                        <div style="position: relative;">
                            <input type="text" id="stockSearch" placeholder="Search products..." class="form-input" style="width: 200px; padding-left: 28px; padding-top: 6px; padding-bottom: 6px;">
                            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0.5;">🔍</span>
                        </div>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div style="max-height: 500px; overflow-y: auto;">
                            ${this.renderStockTable()}
                        </div>
                    </div>
                </div>

                <!--Right: Low Stock Alerts-- >
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
            </div >
    `;
    },

    renderStockTable() {
        if (this.stockSummary.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p>No products found. Add products first.</p>
                </div>`;
        }

        return `
            <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th style="text-align: right;">Batches</th>
                            <th style="text-align: right;">Total Stock</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.stockSummary.map((item) => {
            const status = this.getStockStatus(item.totalStock);
            let badgeType = 'success';
            if (status.label === 'OUT OF STOCK') badgeType = 'danger';
            else if (status.label === 'LOW STOCK') badgeType = 'warning';

            return `
                                <tr>
                                    <td style="font-weight: 500; color: var(--text-main);">${item.productName}</td>
                                    <td style="color: var(--text-muted);">${item.category || 'Uncategorized'}</td>
                                    <td style="text-align: right; color: var(--primary);">${item.batchCount}</td>
                                    <td style="text-align: right; font-weight: 600;">${item.totalStock}</td>
                                    <td style="text-align: center;">
                                        <span class="badge badge-${badgeType}">${status.label}</span>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderLowStockList() {
        if (this.lowStockItems.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: var(--success); font-size: 13px;">✅ All products have sufficient stock</div>';
        }

        return this.lowStockItems.map((item) => `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: ${item.totalStock === 0 ? 'var(--danger-bg)' : 'transparent'};">
                <div>
                    <div style="font-size: 13px; font-weight: 500; color: var(--text-main);">${item.productName}</div>
                    <div style="font-size: 11px; color: var(--text-light);">${item.category || 'Uncategorized'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 700; color: ${item.totalStock === 0 ? 'var(--danger)' : 'var(--accent)'};">${item.totalStock}</div>
                    <div style="font-size: 11px; color: var(--text-light);">units</div>
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
        const colors = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

        return catArray.map(([cat, data], idx) => `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; background: ${colors[idx % colors.length]}; border-radius: 50%;"></div>
                    <span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${cat}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-body);">${data.totalStock} units</div>
                    <div style="font-size: 11px; color: var(--text-light);">${data.count} products</div>
                </div>
            </div>
        `).join('');
    },

    // ===== RAW MATERIALS TAB =====
    renderRawMaterialsTab() {
        const totalMaterials = this.rawMaterials.length;
        const totalValue = this.rawMaterials.reduce((sum, m) => sum + (m.remainingQty * m.rate), 0);

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Raw Materials from Purchases (${totalMaterials})</h3>
                    <div class="badge badge-success" style="font-size: 12px;">Total Value: ₹${totalValue.toFixed(2)}</div>
                </div>
                <div class="card-body" style="padding: 0;">
                    <div style="max-height: 550px; overflow-y: auto;">
                        ${this.rawMaterials.length === 0 ?
                `<div class="empty-state">
                                <div class="empty-state-icon">🌾</div>
                                <p>No raw materials in stock. When you receive a purchase order, raw materials will appear here.</p>
                            </div>` :
                this.renderRawMaterialsTable()
            }
                    </div>
                </div>
            </div>
        `;
    },

    renderRawMaterialsTable() {
        return `
            <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Material Name</th>
                            <th>Unit</th>
                            <th>Vendor</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Initial Qty</th>
                            <th style="text-align: right;">Remaining</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.rawMaterials.map((m) => {
            const percent = m.initialQty > 0 ? (m.remainingQty / m.initialQty * 100) : 0;
            const unit = m.unit || 'KG';
            let statusClass = 'success';
            let statusLabel = 'OK';

            if (percent === 0) { statusClass = 'danger'; statusLabel = 'EMPTY'; }
            else if (percent < 30) { statusClass = 'warning'; statusLabel = 'LOW'; }

            return `
                                <tr>
                                    <td style="font-weight: 500;">${m.materialName}</td>
                                    <td><span class="badge badge-info">${unit}</span></td>
                                    <td style="color: var(--text-muted);">${m.vendorName || '-'}</td>
                                    <td style="text-align: right;">₹${parseFloat(m.rate || 0).toFixed(2)}/${unit}</td>
                                    <td style="text-align: right; color: var(--text-muted);">${m.initialQty} ${unit}</td>
                                    <td style="text-align: right; font-weight: 600; font-size: 16px;">${m.remainingQty} ${unit}</td>
                                    <td style="text-align: center;">
                                        <span class="badge badge-${statusClass}">${statusLabel}</span>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ===== PRODUCTION TAB =====
    // ===== PRODUCTION TAB =====
    renderProductionTab() {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- Left: Create Production Batch -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">🏭 Create Production Batch</h3>
                    </div>
                    <div class="card-body">
                        ${this.renderProductionForm()}
                    </div>
                </div>
                
                <!-- Right: Recent Production Batches -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Production History (${this.productionBatches.length})</h3>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div style="max-height: 550px; overflow-y: auto;">
                            ${this.renderProductionBatchesList()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderProductionForm() {
        const availableMaterials = this.rawMaterials.filter(m => m.remainingQty > 0);
        return `
            <form id="productionForm">
                <div class="form-group">
                    <label class="form-label">Finished Product *</label>
                    <select id="prodProductId" class="form-select" required>
                        <option value="">Select finished product to make</option>
                        ${this.products.map(p => `<option value="${p.id}" data-name="${p.productName}" data-weight="${p.weight || ''}">${p.productName} (${p.weight || 'N/A'})</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Quantity to Produce *</label>
                    <input type="number" id="prodQuantity" class="form-input" min="1" required placeholder="Number of units">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Batch Number</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="prodBatchNumber" class="form-input" placeholder="Auto-generated">
                        <button type="button" id="generateProdBatchNo" class="btn btn-secondary" style="white-space: nowrap;">Generate</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Raw Materials Used</label>
                    <div id="materialsUsedList" style="border: 1px solid var(--border-light); border-radius: 8px; padding: 12px; min-height: 60px; background: var(--bg-surface);">
                        <p style="color: var(--text-muted); font-size: 11px; margin: 0;">Add raw materials below</p>
                    </div>
                </div>
                
                <div class="form-row" style="align-items: end;">
                    <div class="form-group" style="margin: 0; flex: 2;">
                        <label class="form-label">Raw Material</label>
                        <select id="addMaterialSelect" class="form-select">
                            <option value="">Select material</option>
                            ${availableMaterials.map(m => {
            const unit = m.unit || 'KG';
            return `<option value="${m.id}" data-name="${m.materialName}" data-remaining="${m.remainingQty}" data-unit="${unit}">${m.materialName} (${m.remainingQty} ${unit} left)</option>`;
        }).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0; flex: 1;">
                        <label class="form-label">Qty Used</label>
                        <input type="number" id="addMaterialQty" class="form-input" min="0.1" step="0.1" placeholder="0">
                    </div>
                    <button type="button" id="addMaterialBtn" class="btn btn-secondary" style="height: 42px;">+ Add</button>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label class="form-label">Production Date</label>
                    <input type="date" id="prodDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div style="margin-top: 24px;">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Create Production Batch
                    </button>
                </div>
            </form>
        `;
    },

    renderProductionBatchesList() {
        if (this.productionBatches.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">🏭</div>
                    <p>No production batches yet</p>
                </div>`;
        }

        return this.productionBatches.map((batch, idx) => `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: ${idx % 2 === 0 ? 'transparent' : 'var(--bg-surface)'};">
                <div>
                    <div style="font-weight: 600; color: var(--primary);">${batch.batchNumber}</div>
                    <div style="font-size: 13px; color: var(--text-main); font-weight: 500;">${batch.productName}</div>
                    <div style="font-size: 11px; color: var(--text-light);">${batch.productionDate || '-'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: 700; color: var(--success);">${batch.quantityProduced}</div>
                    <div style="font-size: 11px; color: var(--text-light);">units</div>
                </div>
            </div>
        `).join('');
    },

    renderBatchesTab() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Product Batches</h3>
                    <div style="position: relative;">
                        <input type="text" id="batchSearch" placeholder="Search batches..." class="form-input" style="width: 250px; padding-left: 28px; padding-top: 6px; padding-bottom: 6px;">
                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0.5;">🔍</span>
                    </div>
                </div>
                <div class="card-body" style="padding: 0;">
                    <div style="max-height: 550px; overflow-y: auto;">
                        ${this.renderBatchTable()}
                    </div>
                </div>
            </div>
        `;
    },

    renderBatchTable() {
        if (this.batches.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>No batches created yet. Click "Create Batch" to add stock from purchases.</p>
                </div>`;
        }

        return `
            <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Batch #</th>
                            <th>Product</th>
                            <th>Size</th>
                            <th style="text-align: right;">Initial</th>
                            <th style="text-align: right;">Remaining</th>
                            <th>Received</th>
                            <th style="text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.batches.map((batch, idx) => `
                            <tr class="batch-row">
                                <td style="font-weight: 600; color: var(--primary);">${batch.batchNumber}</td>
                                <td style="font-weight: 500;">${batch.productName || 'Unknown'}</td>
                                <td style="color: var(--text-muted);">${batch.packageSize || '-'}</td>
                                <td style="text-align: right; color: var(--text-muted);">${batch.quantity}</td>
                                <td style="text-align: right; font-weight: 600; color: ${batch.remainingQty > 0 ? 'var(--success)' : 'var(--danger)'};">${batch.remainingQty}</td>
                                <td style="color: var(--text-muted);">${batch.receivedDate || '-'}</td>
                                <td style="text-align: center;">
                                    <button class="btn btn-secondary adjust-batch-btn" data-batch-id="${batch.id}" style="padding: 2px 8px; font-size: 11px;">Adjust</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderCreateBatchTab() {
        return `
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <div class="card-header">
                    <h3 class="card-title">Create New Product Batch</h3>
                </div>
                <div class="card-body">
                    <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">
                        Create a batch for products manufactured/packed.
                    </p>
                    
                    <form id="createBatchForm">
                        <div class="form-group">
                            <label class="form-label">Product *</label>
                            <select id="batchProductId" class="form-select" required>
                                <option value="">Select Product</option>
                                ${this.products.map(p => `<option value="${p.id}">${p.productName} (${p.weight || 'No size'})</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Quantity (pieces) *</label>
                            <input type="number" id="batchQuantity" class="form-input" min="1" required placeholder="Number of pieces">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Batch Number *</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="batchNumber" class="form-input" required placeholder="Auto-generated or custom">
                                <button type="button" id="generateBatchNo" class="btn btn-secondary">Generate</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Packed Date</label>
                            <input type="date" id="batchReceivedDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                        </div>

                        <div style="margin-top: 32px;">
                            <button type="submit" class="btn btn-primary" style="width: 100%;">
                                Create Batch
                            </button>
                        </div>
                    </form>
                </div>
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

        // ===== PRODUCTION TAB EVENTS =====

        // Generate Production Batch No
        document.getElementById('generateProdBatchNo')?.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/production-batches/next-batch-no');
                const data = await res.json();
                document.getElementById('prodBatchNumber').value = data.nextBatchNo;
            } catch (error) {
                UI.showToast('Error generating batch number', 'error');
            }
        });

        // Helper to parse weight string to base unit (KG or LTR) value
        const parseWeightValue = (weightStr) => {
            if (!weightStr) return 0;
            const match = weightStr.trim().match(/^([\d\.]+)\s*([a-zA-Z]+)$/i);
            if (!match) return 0;

            let val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();

            // Normalize to KG or LTR
            if (['GM', 'G', 'GMS', 'GRAM', 'GRAMS', 'ML', 'MILLILITER', 'MILLILITERS'].includes(unit)) {
                val /= 1000;
            }

            return val; // Returns value in KG or LTR
        };

        // Add Material to Production Batch
        document.getElementById('addMaterialSelect')?.addEventListener('change', (e) => {
            const matOption = e.target.selectedOptions[0];
            if (!matOption || !matOption.value) return;

            const prodSelect = document.getElementById('prodProductId');
            const prodOption = prodSelect.selectedOptions[0];
            const prodQty = parseFloat(document.getElementById('prodQuantity').value) || 0;

            if (prodOption && prodOption.value && prodQty > 0) {
                const prodWeightStr = prodOption.dataset.weight;
                const matUnit = matOption.dataset.unit || 'KG';

                // Calculate required
                let weightPerUnit = parseWeightValue(prodWeightStr); // in KG/LTR

                if (weightPerUnit > 0) {
                    let totalNeeded = weightPerUnit * prodQty; // in KG/LTR

                    // Convert to material unit if needed
                    if (matUnit === 'GM' || matUnit === 'ML') {
                        totalNeeded *= 1000;
                    }

                    document.getElementById('addMaterialQty').value = totalNeeded;
                    UI.showToast(`Auto-calculated: ${prodQty} x ${prodWeightStr} = ${totalNeeded} ${matUnit}`, 'info');
                }
            }
        });

        document.getElementById('addMaterialBtn')?.addEventListener('click', () => {
            const select = document.getElementById('addMaterialSelect');
            const qtyInput = document.getElementById('addMaterialQty');
            const qty = parseFloat(qtyInput.value);
            const option = select.selectedOptions[0];

            if (!option || !option.value) {
                UI.showToast('Select a material', 'warning');
                return;
            }
            if (!qty || qty <= 0) {
                UI.showToast('Enter valid quantity', 'warning');
                return;
            }

            const remaining = parseFloat(option.dataset.remaining);
            if (qty > remaining) {
                UI.showToast(`Only ${remaining} units available`, 'error');
                return;
            }

            // check if already added
            const existingItem = document.querySelector(`.material - item[data - id="${option.value}"]`);
            if (existingItem) {
                UI.showToast('Material already added', 'warning');
                return;
            }

            const list = document.getElementById('materialsUsedList');
            if (list.querySelector('p')) list.innerHTML = ''; // clear placeholder

            const div = document.createElement('div');
            div.className = 'material-item';
            div.dataset.id = option.value;
            div.dataset.qty = qty;
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px; background: white; border: 1px solid #eee; margin-bottom: 4px; border-radius: 3px; font-size: 11px;';
            div.innerHTML = `
    < span > ${option.dataset.name} (${qty} units)</span >
        <button type="button" onclick="this.parentElement.remove()" style="color: #dc2626; background: none; border: none; cursor: pointer;">✕</button>
`;
            list.appendChild(div);

            // Reset inputs
            select.value = '';
            qtyInput.value = '';
        });

        // Create Production Batch Form
        document.getElementById('productionForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect materials
            const materials = [];
            document.querySelectorAll('.material-item').forEach(item => {
                materials.push({
                    rawMaterialId: parseInt(item.dataset.id),
                    quantityUsed: parseFloat(item.dataset.qty),
                    materialName: item.querySelector('span').textContent.split(' (')[0]
                });
            });

            if (materials.length === 0) {
                if (!confirm('Create batch without recording raw materials used?')) return;
            }

            const data = {
                productId: parseInt(document.getElementById('prodProductId').value),
                productName: document.getElementById('prodProductId').selectedOptions[0].dataset.name,
                quantityProduced: parseInt(document.getElementById('prodQuantity').value),
                batchNumber: document.getElementById('prodBatchNumber').value,
                productionDate: document.getElementById('prodDate').value,
                materials: materials
            };

            if (!data.batchNumber) {
                // Auto generate if empty
                const res = await fetch('/api/production-batches/next-batch-no');
                const d = await res.json();
                data.batchNumber = d.nextBatchNo;
            }

            try {
                const res = await fetch('/api/production-batches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    UI.showToast('✅ Production batch created!', 'success');
                    this.selectedTab = 'production';
                    this.render();
                } else {
                    const err = await res.json();
                    UI.showToast(err.error || 'Error creating batch', 'error');
                }
            } catch (error) {
                UI.showToast('Error creating batch', 'error');
            }
        });

        // Generate batch number
        document.getElementById('generateBatchNo')?.addEventListener('click', async () => {
            const productId = document.getElementById('batchProductId').value;

            if (!productId) {
                UI.showToast('Please select a product first', 'warning');
                return;
            }

            try {
                const res = await fetch(`/ api / product - batches / generate - batch - number / ${productId} `);
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
    < div style = "margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 4px;" >
                <div style="font-weight: 600; color: #9467bd;">${batch.batchNumber}</div>
                <div style="font-size: 12px; color: #333; margin-top: 4px;">${batch.productName}</div>
                <div style="font-size: 11px; color: #666; margin-top: 2px;">Current: ${batch.remainingQty} / ${batch.quantity} pieces</div>
            </div >
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
                const res = await fetch(`/ api / product - batches / ${batchId} `, {
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
