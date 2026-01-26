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
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #9467bd; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
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
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 class="page-title">Inventory Management</h1>
                        <p class="page-subtitle">Batch-based stock tracking and production</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary ${this.selectedTab === 'stock' ? 'active-tab' : ''}" onclick="Inventory.switchTab('stock')">📊 Finished Stock</button>
                        <button class="btn btn-secondary ${this.selectedTab === 'batches' ? 'active-tab' : ''}" onclick="Inventory.switchTab('batches')">📋 Batches</button>
                    <button class="btn btn-secondary ${this.selectedTab === 'raw-materials' ? 'active-tab' : ''}" onclick="Inventory.switchTab('raw-materials')">🌾 Raw Materials</button>
                        <button class="btn btn-secondary ${this.selectedTab === 'production' ? 'active-tab' : ''}" onclick="Inventory.switchTab('production')">🏭 Production</button>
                    </div>
                </div>

                <!-- KPI Stats -->
                <div class="stats-grid">
                    ${this.renderKPI('Total Products', this.products.length.toString(), 'In catalog', 'info', '📦')}
                    ${this.renderKPI('Active Batches', stats.activeBatches.toString(), 'With stock', 'success', '📋')}
                    ${this.renderKPI('Total Stock', stats.totalStock.toString(), 'Units available', 'warning', '📊')}
                    ${this.renderKPI('Low Stock', this.lowStockItems.length.toString(), 'Need reorder', 'danger', '⚠️')}
                </div>

                <!-- Main Content -->
                <div id="inventoryTabContent" class="card card-body" style="min-height: 400px;">
                    ${this.renderTabContent()}
                </div>

                <style>
                    .active-tab {
                        background: var(--primary) !important;
                        color: white !important;
                        border-color: var(--primary) !important;
                    }
                </style>
            `;
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Inventory render error:', error);
            contentArea.innerHTML = `
                < div style = "text-align: center; padding: 60px 20px;" >
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading inventory: ${error.message}</p>
                </div >
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
    < div style = "background: white; padding: 14px 16px; border-right: 1px solid #ddd; position: relative;" >
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${color};"></div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                    <div>
                        <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">${label}</div>
                        <div style="font-size: 20px; font-weight: 700; color: #333;">${value}</div>
                        <div style="font-size: 10px; color: #888; margin-top: 3px;">${subtitle}</div>
                    </div>
                    <div style="font-size: 20px; opacity: 0.3;">${icon}</div>
                </div>
            </div >
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
    < div style = "display: grid; grid-template-columns: 2fr 1fr; gap: 0;" >
                < !--Left: Stock Table-- >
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
            return '<div style="padding: 40px; text-align: center; color: #666;">No products found. Add products first.</div>';
        }

        return `
    < table style = "width: 100%; border-collapse: collapse; font-size: 12px;" >
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
                                <td style="padding: 8px 12px; text-align: right; color: #3182ce;">${item.batchCount}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${status.valueColor};">${item.totalStock}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; background: ${status.bg}; color: ${status.color};">${status.label}</span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table >
    `;
    },

    renderLowStockList() {
        if (this.lowStockItems.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #2ca02c; font-size: 12px;">✅ All products have sufficient stock</div>';
        }

        return this.lowStockItems.map((item, idx) => `
    < div style = "padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: ${item.totalStock === 0 ? '#fde7e9' : '#fff'};" >
                <div>
                    <div style="font-size: 12px; font-weight: 500; color: #333;">${item.productName}</div>
                    <div style="font-size: 10px; color: #888;">${item.category || 'Uncategorized'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 700; color: ${item.totalStock === 0 ? '#d13438' : '#ff7f0e'};">${item.totalStock}</div>
                    <div style="font-size: 10px; color: #888;">units</div>
                </div>
            </div >
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
        const colors = ['#3182ce', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

        return catArray.map(([cat, data], idx) => `
    < div style = "padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;" >
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; background: ${colors[idx % colors.length]}; border-radius: 50%;"></div>
                    <span style="font-size: 12px; color: #333;">${cat}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; font-weight: 600; color: ${colors[idx % colors.length]};">${data.totalStock} units</div>
                    <div style="font-size: 10px; color: #888;">${data.count} products</div>
                </div>
            </div >
    `).join('');
    },

    // ===== RAW MATERIALS TAB =====
    renderRawMaterialsTab() {
        const totalMaterials = this.rawMaterials.length;
        const totalValue = this.rawMaterials.reduce((sum, m) => sum + (m.remainingQty * m.rate), 0);

        return `
    < div style = "background: white; min-height: 400px;" >
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #dcfce7;">
                    <span style="font-size: 13px; font-weight: 600; color: #166534;">🌾 Raw Materials from Purchases (${totalMaterials})</span>
                    <span style="font-size: 12px; color: #166534;">Total Value: ₹${totalValue.toFixed(2)}</span>
                </div>
                <div style="max-height: 550px; overflow-y: auto;">
                    ${this.rawMaterials.length === 0 ?
                '<div style="padding: 60px; text-align: center; color: #666;"><p style="font-size: 16px; margin-bottom: 8px;">📦 No raw materials in stock</p><p style="font-size: 12px;">When you receive a purchase order, raw materials will appear here.</p></div>' :
                this.renderRawMaterialsTable()
            }
                </div>
            </div >
    `;
    },

    renderRawMaterialsTable() {
        return `
    < table style = "width: 100%; border-collapse: collapse; font-size: 12px;" >
                <thead style="background: #059669; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">Material Name</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">Weight</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: white;">Vendor</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: white;">Rate (₹)</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: white;">Initial</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: white;">Remaining</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: white;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.rawMaterials.map((m, idx) => {
            const percent = m.initialQty > 0 ? (m.remainingQty / m.initialQty * 100) : 0;
            const statusColor = percent === 0 ? '#d13438' : percent < 30 ? '#ff7f0e' : '#2ca02c';
            const statusBg = percent === 0 ? '#fee2e2' : percent < 30 ? '#fef3c7' : '#dcfce7';
            const statusLabel = percent === 0 ? 'EMPTY' : percent < 30 ? 'LOW' : 'OK';
            return `
                            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                <td style="padding: 8px 12px; font-weight: 500; color: #333;">${m.materialName}</td>
                                <td style="padding: 8px 12px; color: #666;">${m.weight || '-'}</td>
                                <td style="padding: 8px 12px; color: #666;">${m.vendorName || '-'}</td>
                                <td style="padding: 8px 12px; text-align: right; color: #333;">₹${parseFloat(m.rate || 0).toFixed(2)}</td>
                                <td style="padding: 8px 12px; text-align: right; color: #666;">${m.initialQty}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: ${statusColor};">${m.remainingQty}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">${statusLabel}</span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table >
    `;
    },

    // ===== PRODUCTION TAB =====
    renderProductionTab() {
        return `
    < div style = "display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 450px;" >
                < !--Left: Create Production Batch-- >
                <div style="border-right: 1px solid #ddd;">
                    <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #dc2626;">
                        <span style="font-size: 13px; font-weight: 600; color: white;">🏭 Create Production Batch</span>
                    </div>
                    <div style="padding: 20px;">
                        ${this.renderProductionForm()}
                    </div>
                </div>
                
                <!--Right: Recent Production Batches-- >
    <div>
        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #f8f9fa;">
            <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Production History (${this.productionBatches.length})</span>
        </div>
        <div style="max-height: 500px; overflow-y: auto;">
            ${this.renderProductionBatchesList()}
        </div>
    </div>
            </div >
    `;
    },

    renderProductionForm() {
        const availableMaterials = this.rawMaterials.filter(m => m.remainingQty > 0);
        return `
    < form id = "productionForm" >
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Finished Product *</label>
                    <select id="prodProductId" class="form-select" style="width: 100%;" required>
                        <option value="">Select finished product to make</option>
                        ${this.products.map(p => `<option value="${p.id}" data-name="${p.productName}">${p.productName} (${p.weight || 'N/A'})</option>`).join('')}
                    </select>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Quantity to Produce *</label>
                    <input type="number" id="prodQuantity" class="form-input" min="1" required placeholder="Number of units">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Batch Number</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="prodBatchNumber" class="form-input" style="flex: 1;" placeholder="Auto-generated">
                        <button type="button" id="generateProdBatchNo" style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Generate</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Raw Materials Used</label>
                    <div id="materialsUsedList" style="border: 1px solid #ddd; border-radius: 4px; padding: 8px; min-height: 60px; background: #f8f9fa;">
                        <p style="color: #666; font-size: 11px; margin: 0; padding: 4px;">Add raw materials below</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px; display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: end;">
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Raw Material</label>
                        <select id="addMaterialSelect" class="form-select" style="font-size: 11px;">
                            <option value="">Select material</option>
                            ${availableMaterials.map(m => `<option value="${m.id}" data-name="${m.materialName}" data-remaining="${m.remainingQty}">${m.materialName} (${m.remainingQty} left)</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Qty Used</label>
                        <input type="number" id="addMaterialQty" class="form-input" style="font-size: 11px;" min="0.1" step="0.1" placeholder="0">
                    </div>
                    <button type="button" id="addMaterialBtn" style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Add</button>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Production Date</label>
                    <input type="date" id="prodDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div style="padding-top: 16px; border-top: 1px solid #eee;">
                    <button type="submit" style="background: #059669; color: white; border: none; padding: 10px 24px; border-radius: 4px; font-size: 13px; cursor: pointer; width: 100%;">
                        🏭 Create Production Batch
                    </button>
                </div>
            </form >
    `;
    },

    renderProductionBatchesList() {
        if (this.productionBatches.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;"><p>No production batches yet</p></div>';
        }

        return this.productionBatches.map((batch, idx) => `
    < div style = "padding: 12px 16px; border-bottom: 1px solid #eee; background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};" >
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; color: #dc2626;">${batch.batchNumber}</div>
                <div style="font-size: 12px; color: #333;">${batch.productName}</div>
                <div style="font-size: 11px; color: #666;">${batch.productionDate || '-'}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700; color: #059669;">${batch.quantityProduced}</div>
                <div style="font-size: 10px; color: #666;">units</div>
            </div>
        </div>
            </div >
    `).join('');
    },

    renderBatchesTab() {
        return `
    < div style = "background: white; min-height: 400px;" >
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Product Batches</span>
                    <input type="text" id="batchSearch" placeholder="Search batches..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;">
                    ${this.renderBatchTable()}
                </div>
            </div >
    `;
    },

    renderBatchTable() {
        if (this.batches.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No batches created yet. Click "Create Batch" to add stock from purchases.</div>';
        }

        return `
    < table style = "width: 100%; border-collapse: collapse; font-size: 12px;" >
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
            </table >
    `;
    },

    renderCreateBatchTab() {
        return `
    < div style = "background: white; padding: 20px; max-width: 600px; margin: 0 auto;" >
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
            </div >
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

        // Add Material to Production Batch
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
                UI.showToast(`Only ${ remaining } units available`, 'error');
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
    < span > ${ option.dataset.name } (${ qty } units)</span >
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
                const res = await fetch(`/ api / product - batches / generate - batch - number / ${ productId } `);
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
                const res = await fetch(`/ api / product - batches / ${ batchId } `, {
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
