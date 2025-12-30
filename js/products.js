// ================================
// Products Module - Tableau-style Design
// ================================

const Products = {
    currentProducts: [],
    viewMode: 'list', // 'list' or 'form'
    editingProduct: null,

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #2ca02c; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/products');
            this.currentProducts = await response.json();

            // Calculate stats
            const totalProducts = this.currentProducts.length;
            const totalMRP = this.currentProducts.reduce((sum, p) => sum + (parseFloat(p.mrp) || 0), 0);
            const categories = [...new Set(this.currentProducts.map(p => p.weight || 'No Weight'))].length;

            contentArea.innerHTML = `
                <!-- Tableau-style Products -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2ca02c;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">📦</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Product Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Manage your product catalog</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="prod-tab-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">📋 Products</button>
                            <button class="prod-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" data-view="form" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">➕ ${this.editingProduct ? 'Edit' : 'Add New'}</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Products', totalProducts.toString(), 'In catalog', '#2ca02c', '📦')}
                        ${this.renderKPI('Catalog Value', Utils.formatCurrency(totalMRP), 'Total MRP', '#1f77b4', '💰')}
                        ${this.renderKPI('Product Sizes', categories.toString(), 'Unique weights', '#ff7f0e', '📊')}
                    </div>

                    <!-- Main Content -->
                    <div id="productContent">
                        ${this.viewMode === 'list' ? this.renderListView() : this.renderFormView()}
                    </div>
                </div>

                <style>
                    .prod-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .prod-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .prod-tab-btn.active {
                        background: #1f77b4;
                        border-color: #1f77b4;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Products render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading products: ${error.message}</p>
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

    renderListView() {
        return `
            <div style="background: white; min-height: 400px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 All Products (${this.currentProducts.length})</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="searchInput" placeholder="Search products..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 200px;">
                        <button id="importProductsBtn" style="background: #f0f0f0; border: 1px solid #ddd; padding: 5px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">📤 Import</button>
                        <button id="clearProductsBtn" style="background: #d62728; color: white; border: none; padding: 5px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">🗑️ Clear</button>
                    </div>
                </div>
                <div style="max-height: 550px; overflow-y: auto;" id="productsTable">
                    ${this.renderTable(this.currentProducts)}
                </div>
            </div>
        `;
    },

    renderTable(products) {
        if (products.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No products found. Click "Add New" to create your first product!</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">S.No.</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">Product Name</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">Weight</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">HSN</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">GST%</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">MRP</th>
                        <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">Margin%</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #2ca02c;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((p, idx) => `
                        <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};" id="row-${p.id}">
                            <td style="padding: 8px 12px; color: #666;">${p.serialNumber || '-'}</td>
                            <td style="padding: 8px 12px; font-weight: 500; color: #333;">${p.productName}</td>
                            <td style="padding: 8px 12px; color: #666;">${p.weight || '-'}</td>
                            <td style="padding: 8px 12px; color: #666;">${p.hsnCode || '-'}</td>
                            <td style="padding: 8px 12px; text-align: right; color: #1f77b4;">${p.gstRate ? p.gstRate + '%' : '-'}</td>
                            <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #2ca02c;">₹${parseFloat(p.mrp || 0).toFixed(2)}</td>
                            <td style="padding: 8px 12px; text-align: right; color: #ff7f0e;">${p.distributorMargin ? p.distributorMargin + '%' : '-'}</td>
                            <td style="padding: 8px 12px; text-align: center;">
                                <button data-action="edit" data-id="${p.id}" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 4px;">✏️</button>
                                <button data-action="delete" data-id="${p.id}" style="background: #fde7e9; border: 1px solid #f3d6d8; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #d13438;">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderFormView() {
        const p = this.editingProduct;
        return `
            <div style="background: white;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">${p ? '✏️ Edit Product' : '➕ Add New Product'}</span>
                    <button class="prod-tab-btn" data-view="list" style="background: #f0f0f0; border: 1px solid #ddd; color: #333;">← Back</button>
                </div>
                <div style="padding: 20px; max-width: 800px;">
                    <form id="productForm">
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">S.No.</label>
                                <input type="text" name="serialNumber" value="${p?.serialNumber || ''}" placeholder="e.g., 1" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">Product Name *</label>
                                <input type="text" name="productName" value="${p?.productName || ''}" placeholder="Enter product name" required style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">Weight</label>
                                <input type="text" name="weight" value="${p?.weight || ''}" placeholder="e.g., 500 GMS" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">HSN/SAC Code</label>
                                <input type="text" name="hsnCode" value="${p?.hsnCode || ''}" placeholder="e.g., 12345678" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">GST Rate (%)</label>
                                <input type="number" name="gstRate" value="${p?.gstRate || ''}" placeholder="e.g., 18" step="0.01" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">MRP (₹) *</label>
                                <input type="number" name="mrp" value="${p?.mrp || ''}" placeholder="0.00" step="0.01" required style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">Margin (%)</label>
                                <input type="number" name="distributorMargin" value="${p?.distributorMargin || ''}" placeholder="e.g., 20" step="0.01" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                            </div>
                        </div>
                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; display: flex; gap: 10px;">
                            <button type="submit" style="background: #2ca02c; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 12px; cursor: pointer;">${p ? '💾 Update Product' : '➕ Add Product'}</button>
                            <button type="button" data-view="list" style="background: #f0f0f0; border: 1px solid #ddd; padding: 10px 20px; border-radius: 4px; font-size: 12px; cursor: pointer;">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newView = e.target.dataset.view;
                if (newView === 'form' && this.viewMode !== 'form') {
                    this.editingProduct = null;
                }
                this.viewMode = newView;
                this.render();
            });
        });

        // Import
        document.getElementById('importProductsBtn')?.addEventListener('click', () => {
            this.showImportSection();
        });

        // Clear all
        document.getElementById('clearProductsBtn')?.addEventListener('click', async () => {
            if (confirm('Delete ALL products? This cannot be undone.')) {
                await this.clearAllProducts();
            }
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = this.currentProducts.filter(product =>
                    product.productName?.toLowerCase().includes(searchTerm) ||
                    product.hsnCode?.includes(searchTerm)
                );
                document.getElementById('productsTable').innerHTML = this.renderTable(filtered);
                this.attachTableActions();
            }, 300));
        }

        // Form submit
        document.getElementById('productForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });

        this.attachTableActions();
    },

    attachTableActions() {
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editProduct(id);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Delete this product?')) {
                    await this.deleteProduct(id);
                }
            });
        });
    },

    async saveProduct() {
        const form = document.getElementById('productForm');
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData);
        productData.mrp = parseFloat(productData.mrp) || 0;
        productData.gstRate = parseFloat(productData.gstRate) || 0;
        productData.distributorMargin = parseFloat(productData.distributorMargin) || 0;

        try {
            let url = '/api/products';
            let method = 'POST';

            if (this.editingProduct) {
                url = `/api/products/${this.editingProduct.id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (!response.ok) throw new Error('Save failed');

            UI.showToast(this.editingProduct ? '✅ Product updated!' : '✅ Product added!', 'success');
            this.editingProduct = null;
            this.viewMode = 'list';
            this.render();
        } catch (error) {
            console.error('Error saving product:', error);
            UI.showToast('Error saving product', 'error');
        }
    },

    editProduct(id) {
        this.editingProduct = this.currentProducts.find(p => p.id === id);
        this.viewMode = 'form';
        this.render();
    },

    async deleteProduct(id) {
        try {
            await fetch(`/api/products/${id}`, { method: 'DELETE' });
            UI.showToast('✅ Product deleted!', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting product:', error);
            UI.showToast('Error deleting product', 'error');
        }
    },

    async clearAllProducts() {
        try {
            await fetch('/api/products', { method: 'DELETE' });
            UI.showToast('✅ All products cleared!', 'success');
            this.render();
        } catch (error) {
            console.error('Error clearing products:', error);
            UI.showToast('Error clearing products', 'error');
        }
    },

    showImportSection() {
        // Replace current content with import form inline
        const content = document.getElementById('productContent');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📤 Import Products from CSV</h2>
                    <button class="btn btn-secondary" data-view="list">← Back</button>
                </div>
                <div class="card-body">
                    <p style="margin-bottom: 1rem; color: #6b7280;">
                        Upload a CSV file with columns: <strong>serialNumber, productName, weight, mrp, hsnCode, gstRate, distributorMargin</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <input type="file" id="fileInput" accept=".csv" class="form-input" style="flex: 1;">
                        <button class="btn btn-primary" id="doImportBtn">📤 Import</button>
                    </div>
                </div>
            </div>
        `;

        content.querySelector('[data-view="list"]').addEventListener('click', () => {
            this.viewMode = 'list';
            this.render();
        });

        content.querySelector('#doImportBtn').addEventListener('click', () => {
            const file = document.getElementById('fileInput').files[0];
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
                UI.showToast('No data found in CSV', 'error');
                return;
            }

            const response = await fetch('/api/products/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Import failed');

            const result = await response.json();
            UI.showToast(result.message || '✅ Import successful!', 'success');
            this.viewMode = 'list';
            this.render();

        } catch (error) {
            console.error('Error importing CSV:', error);
            UI.showToast('Error importing: ' + error.message, 'error');
        }
    }
};
