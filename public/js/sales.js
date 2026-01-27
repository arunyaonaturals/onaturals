// ================================
// Sales Invoice Module - Tableau-style Design
// ================================

const Sales = {
    currentInvoices: [],
    stores: [],
    products: [],
    companySettings: {},
    selectedStoreId: null,
    storeProductMargins: new Map(),
    selectedProducts: new Map(),

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #2ca02c; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const [storesRes, productsRes, companyRes, nextInvoiceRes] = await Promise.all([
                fetch('/api/stores'),
                fetch('/api/products'),
                fetch('/api/company-settings'),
                fetch('/api/sales-orders/next-invoice-no')
            ]);

            this.stores = await storesRes.json();
            this.products = await productsRes.json();
            this.companySettings = await companyRes.json();
            const nextInvoiceData = await nextInvoiceRes.json();

            this.selectedProducts.clear();

            const editInvoice = window.pendingEditInvoice || null;
            if (editInvoice) {
                window.pendingEditInvoice = null;
                this.editingInvoiceId = editInvoice.id;
            } else {
                this.editingInvoiceId = null;
            }

            contentArea.innerHTML = `
                <!-- Page Title Header -->
                <div style="background: #059669; color: white; padding: 20px; margin: -20px -20px 20px -20px; border-bottom: 4px solid #1d4ed8;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700;">📄 Create Tax Invoice</h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Generate GST-compliant invoices • ${this.products.length} Products • ${this.stores.length} Stores</p>
                </div>

                <!-- Main Form Container -->
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="max-width: 1200px; margin: 0 auto;">
                            
                            <!-- Invoice Header -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">Invoice Date *</label>
                                    <input type="date" id="invoiceDate" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;" required>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 600; color: #555; margin-bottom: 4px; text-transform: uppercase;">Invoice No *</label>
                                    <input type="text" id="invoiceNo" value="${nextInvoiceData.nextInvoiceNo}" readonly style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px; background: #f8f9fa; font-weight: 600;">
                                </div>
                            </div>

                            <!-- Store Selection -->
                            <div class="form-group">
                                <label class="form-label">Select Store *</label>
                                <select class="form-select" id="storeSelect" required>
                                    <option value="">-- Select Store --</option>
                                    ${this.stores.map(s => `
                                        <option value="${s.id}" 
                                            data-name="${s.storeName}"
                                            data-storeid="${s.storeId || ''}"
                                            data-address1="${s.addressLine1 || s.address || ''}"
                                            data-address2="${s.addressLine2 || ''}"
                                            data-pincode="${s.pinCode || ''}"
                                            data-gstin="${s.gstNumber || ''}"
                                            data-area="${s.area || ''}"
                                            data-captain="${s.salesCaptain || ''}"
                                            data-orderphone="${s.orderPhone || s.phone1 || ''}"
                                            data-accountsphone="${s.accountsPhone || s.phone2 || ''}"
                                            data-email="${s.email || ''}"
                                            data-category="${s.storeCategory || ''}"
                                            data-code="33">
                                            ${s.storeId || '#' + s.id} - ${s.storeName} - ${s.area}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <!-- Store Details Display -->
                            <div id="storeDetails" style="display: none; padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-md);">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
                                    <p style="margin: 0; font-size: var(--font-size-sm);"><strong>Store ID:</strong> <span id="storeIdDisplay"></span></p>
                                    <p style="margin: 0; font-size: var(--font-size-sm);"><strong>Category:</strong> <span id="storeCategoryDisplay"></span></p>
                                </div>
                                <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>Address:</strong> <span id="storeAddress"></span></p>
                                <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>PIN Code:</strong> <span id="storePinCode"></span></p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm); margin-top: var(--spacing-xs);">
                                    <p style="margin: 0; font-size: var(--font-size-sm);"><strong>Order Phone:</strong> <span id="storeOrderPhone"></span></p>
                                    <p style="margin: 0; font-size: var(--font-size-sm);"><strong>Accounts Phone:</strong> <span id="storeAccountsPhone"></span></p>
                                </div>
                                <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>Email:</strong> <span id="storeEmail"></span></p>
                                <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>GSTIN:</strong> <span id="storeGstin"></span></p>
                                <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>Sales Captain:</strong> <span id="storeCaptain"></span></p>
                            </div>

                            <!-- Product Selection Table -->
                            <div>
                                <h3 style="margin-bottom: 12px; font-size: 16px; font-weight: 600; color: #1e40af;">📦 Select Products</h3>
                                <div style="border: 2px solid #3b82f6; border-radius: 8px; overflow: hidden;">
                                    <table class="table" style="margin: 0; width: 100%; border-collapse: collapse;">
                                        <thead style="background: #1e40af;">
                                            <tr>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: left; width: 40px;">☑️</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: left;">S.No.</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: left;">Product</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: left;">Weight</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: left;">HSN/SAC</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: center;">GST%</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: right;">MRP (₹)</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: center; width: 70px;">Qty</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: center; width: 80px;">Margin%</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: right;">Dist. Price</th>
                                                <th style="padding: 12px 10px; color: white; font-weight: 600; font-size: 12px; text-align: right;">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody id="productsTableBody">
                                            ${this.renderProductsForSelection()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Invoice Summary -->
                            <div style="background: var(--primary-50); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 2px solid var(--primary-200);">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                                    <div>
                                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total Items</p>
                                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="totalItems">0</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total Quantity</p>
                                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="totalQuantity">0</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Subtotal</p>
                                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="subtotalDisplay">₹0.00</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total GST</p>
                                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="gstDisplay">₹0.00</p>
                                    </div>
                                </div>
                                <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 2px solid var(--primary-300);">
                                    <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-700);">Grand Total</p>
                                    <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-700);" id="grandTotalDisplay">₹0.00</p>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div style="display: flex; gap: var(--spacing-md); justify-content: flex-end;">
                                <button class="btn btn-secondary" id="resetFormBtn">🔄 Reset Form</button>
                                <button class="btn btn-primary" id="savePrintBtn" style="font-size: var(--font-size-lg); padding: var(--spacing-md) var(--spacing-xl);">
                                    🖨️ Save & Print
                                </button>
                                <button class="btn btn-success" id="saveInvoiceBtn" style="font-size: var(--font-size-lg); padding: var(--spacing-md) var(--spacing-xl);">
                                    💾 Save Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.attachInvoiceFormListeners();

            // If editing an existing invoice, populate the form
            if (editInvoice) {
                this.populateEditForm(editInvoice);
            }

        } catch (error) {
            console.error('Sales render error:', error);
            UI.showToast('Error loading sales form', 'error');
        }
    },

    // Populate form for editing existing invoice
    async populateEditForm(invoice) {
        // Set invoice details
        document.getElementById('invoiceNo').value = invoice.invoiceNo || '';
        document.getElementById('invoiceDate').value = invoice.orderDate || '';

        // Select the store
        const storeSelect = document.getElementById('storeSelect');
        if (storeSelect && invoice.storeId) {
            storeSelect.value = invoice.storeId;
            // Trigger store selection to load store details
            storeSelect.dispatchEvent(new Event('change'));

            // Wait for store margins to load
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Add products from the invoice
        if (invoice.items && invoice.items.length > 0) {
            for (const item of invoice.items) {
                // Find product in products list
                const product = this.products.find(p => p.id === item.productId || p.productName === item.productName);
                if (product) {
                    // Get the margin (use saved distributorMargin from invoice item or product default)
                    const margin = item.distributorMargin || product.distributorMargin || 0;

                    // Add to selected products
                    this.selectedProducts.set(product.id, {
                        product: product,
                        quantity: item.quantity || 1,
                        margin: margin
                    });
                }
            }

            // Update the products table
            this.updateProductsTable();
            this.updateTotals();
        }

        UI.showToast('📝 Invoice loaded for editing', 'success');
    },

    renderInvoicesTable(invoices) {
        const columns = [
            { field: 'invoiceNo', label: 'Invoice No' },
            { field: 'orderDate', label: 'Date', formatter: (v) => Utils.formatDateDDMMYYYY(v) },
            { field: 'storeName', label: 'Store Name' },
            { field: 'grandTotal', label: 'Grand Total', formatter: (v) => Utils.formatCurrency(v) },
            { field: 'status', label: 'Status' }
        ];

        const actions = [
            { label: '👁️', action: 'view', type: 'secondary' },
            { label: '🖨️', action: 'print', type: 'secondary' },
            { label: '🗑️', action: 'delete', type: 'secondary' }
        ];

        return UI.createTable(columns, invoices, actions);
    },

    attachEventListeners() {
        document.getElementById('createInvoiceBtn')?.addEventListener('click', () => {
            this.showInvoiceForm();
        });

        this.attachTableActions();
    },

    attachTableActions() {
        document.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.viewInvoice(id);
            });
        });

        document.querySelectorAll('[data-action="print"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.printInvoice(id);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (await UI.confirm('Are you sure you want to delete this invoice?')) {
                    await this.deleteInvoice(id);
                }
            });
        });
    },

    showInvoiceForm() {
        if (this.stores.length === 0) {
            UI.showToast('Please add stores first', 'warning');
            return;
        }
        if (this.products.length === 0) {
            UI.showToast('Please add products first', 'warning');
            return;
        }

        this.selectedProducts.clear();

        const formHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--spacing-lg);">
                <!-- Invoice Header -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">Invoice Date *</label>
                        <input type="date" class="form-input" id="invoiceDate" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Invoice No *</label>
                        <input type="text" class="form-input" id="invoiceNo" placeholder="e.g., 2025-26/001" required>
                    </div>
                </div>

                <!-- Store Selection -->
                <div class="form-group">
                    <label class="form-label">Select Store *</label>
                    <select class="form-select" id="storeSelect" required>
                        <option value="">-- Select Store --</option>
                        ${this.stores.map(s => `
                            <option value="${s.id}" 
                                data-name="${s.storeName}"
                                data-serial="${s.serialNumber || ''}"
                                data-address="${s.address || ''}"
                                data-gstin="${s.gstNumber || ''}"
                                data-state="${s.area || ''}"
                                data-code="33">
                                #${s.serialNumber || s.id} - ${s.storeName} - ${s.area}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Store Details Display -->
                <div id="storeDetails" style="display: none; padding: var(--spacing-md); background: var(--gray-50); border-radius: var(--radius-md);">
                    <p style="margin: 0; font-size: var(--font-size-sm);"><strong>Address:</strong> <span id="storeAddress"></span></p>
                    <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-sm);"><strong>GSTIN:</strong> <span id="storeGstin"></span></p>
                </div>

                <!-- Product Selection Table -->
                <div>
                    <h3 style="margin-bottom: var(--spacing-md);">Select Products</h3>
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--gray-300); border-radius: var(--radius-md);">
                        <table class="table" style="margin: 0;">
                            <thead style="position: sticky; top: 0; background: var(--gray-100); z-index: 1;">
                                <tr>
                                    <th style="width: 40px;">☑️</th>
                                    <th>S.No.</th>
                                    <th>Product</th>
                                    <th>HSN/SAC</th>
                                    <th>GST%</th>
                                    <th>MRP (₹)</th>
                                    <th style="width: 80px;">Qty</th>
                                    <th style="width: 80px;">Margin%</th>
                                    <th>Dist. Price</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody id="productsTableBody">
                                ${this.renderProductsForSelection()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Invoice Summary -->
                <div style="background: var(--primary-50); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 2px solid var(--primary-200);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                        <div>
                            <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total Items</p>
                            <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="totalItems">0</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total Quantity</p>
                            <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="totalQuantity">0</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Subtotal</p>
                            <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="subtotalDisplay">₹0.00</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-600);">Total GST</p>
                            <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-xl); font-weight: 700;" id="gstDisplay">₹0.00</p>
                        </div>
                    </div>
                    <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 2px solid var(--primary-300);">
                        <p style="margin: 0; font-size: var(--font-size-sm); color: var(--gray-700);">Grand Total</p>
                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-700);" id="grandTotalDisplay">₹0.00</p>
                    </div>
                </div>
            </div>
        `;

        const buttons = [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: '💾 Save Invoice', type: 'success', action: 'submit' }
        ];

        UI.createModal('Create Tax Invoice', formHTML, buttons);

        this.attachInvoiceFormListeners();
    },

    renderProductsForSelection() {
        return this.products.map(p => `
            <tr id="product-row-${p.id}">
                <td><input type="checkbox" class="product-checkbox" data-product-id="${p.id}"></td>
                <td>${p.serialNumber || p.id}</td>
                <td>${p.productName}</td>
                <td>${p.weight || '-'}</td>
                <td>${p.hsnCode || '-'}</td>
                <td>${p.gstRate || 0}%</td>
                <td>₹${parseFloat(p.mrp || 0).toFixed(2)}</td>
                <td><input type="number" class="form-input" style="width: 70px; padding: 4px;" id="qty-${p.id}" value="1" min="1" disabled></td>
                <td><input type="number" class="form-input" style="width: 70px; padding: 4px;" id="margin-${p.id}" value="${p.distributorMargin || 0}" step="0.01" min="0" max="100" disabled></td>
                <td id="dist-price-${p.id}">₹0.00</td>
                <td id="amount-${p.id}">₹0.00</td>
            </tr>
        `).join('');
    },

    attachInvoiceFormListeners() {
        // Store selection
        document.getElementById('storeSelect')?.addEventListener('change', async (e) => {
            const option = e.target.selectedOptions[0];
            if (option.value) {
                document.getElementById('storeDetails').style.display = 'block';

                // Build full address
                const address1 = option.dataset.address1 || '';
                const address2 = option.dataset.address2 || '';
                const fullAddress = [address1, address2].filter(Boolean).join(', ') || '-';

                document.getElementById('storeIdDisplay').textContent = option.dataset.storeid || '-';
                document.getElementById('storeCategoryDisplay').textContent = option.dataset.category || '-';
                document.getElementById('storeAddress').textContent = fullAddress;
                document.getElementById('storePinCode').textContent = option.dataset.pincode || '-';
                document.getElementById('storeOrderPhone').textContent = option.dataset.orderphone || '-';
                document.getElementById('storeAccountsPhone').textContent = option.dataset.accountsphone || '-';
                document.getElementById('storeEmail').textContent = option.dataset.email || '-';
                document.getElementById('storeGstin').textContent = option.dataset.gstin || '-';
                document.getElementById('storeCaptain').textContent = option.dataset.captain || '-';

                // Load store-specific margins
                this.selectedStoreId = parseInt(option.value);
                await this.loadStoreMargins(this.selectedStoreId);
            } else {
                document.getElementById('storeDetails').style.display = 'none';
                this.selectedStoreId = null;
                this.storeProductMargins.clear();
            }
        });

        // Product checkbox handling
        document.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                const qtyInput = document.getElementById(`qty-${productId}`);
                const marginInput = document.getElementById(`margin-${productId}`);

                if (e.target.checked) {
                    qtyInput.disabled = false;
                    marginInput.disabled = false;
                    this.addProduct(productId);
                } else {
                    qtyInput.disabled = true;
                    marginInput.disabled = true;
                    this.selectedProducts.delete(productId);
                    this.updateInvoiceSummary();
                }
            });
        });

        // Quantity and margin change handlers
        this.products.forEach(p => {
            const qtyInput = document.getElementById(`qty-${p.id}`);
            const marginInput = document.getElementById(`margin-${p.id}`);

            qtyInput?.addEventListener('input', () => {
                if (this.selectedProducts.has(p.id)) {
                    this.updateProductCalculations(p.id);
                }
            });

            marginInput?.addEventListener('input', () => {
                if (this.selectedProducts.has(p.id)) {
                    this.updateProductCalculations(p.id);
                }
            });
        });

        // Reset form
        document.getElementById('resetFormBtn')?.addEventListener('click', () => {
            this.render();
        });

        // Save & Print invoice
        const savePrintBtn = document.getElementById('savePrintBtn');
        if (savePrintBtn) {
            savePrintBtn.addEventListener('click', () => {
                this.saveInvoice(true); // Pass true to print after save
            });
        }

        // Save invoice - bind this context properly
        const saveBtn = document.getElementById('saveInvoiceBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveInvoice(false); // Pass false to not print
            });
        }
    },

    addProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Use store-specific margin if available, otherwise use default
        const margin = this.storeProductMargins.get(productId) ?? product.distributorMargin ?? 0;

        this.selectedProducts.set(productId, { product, quantity: 1, margin });
        this.updateProductCalculations(productId);
    },

    async loadStoreMargins(storeId) {
        try {
            const response = await fetch(`/api/store-product-margins/${storeId}/all-products`);
            if (!response.ok) {
                console.error('Failed to load store margins');
                return;
            }

            const productsWithMargins = await response.json();
            this.storeProductMargins.clear();

            // Store the effective margin for each product
            productsWithMargins.forEach(p => {
                this.storeProductMargins.set(p.productId, p.effectiveMargin);
            });

            // Update all margin input fields to reflect store-specific margins
            this.products.forEach(product => {
                const marginInput = document.getElementById(`margin-${product.id}`);
                if (marginInput) {
                    const effectiveMargin = this.storeProductMargins.get(product.id) ?? product.distributorMargin ?? 0;
                    marginInput.value = effectiveMargin;

                    // If product is already selected, update its calculations
                    if (this.selectedProducts.has(product.id)) {
                        this.updateProductCalculations(product.id);
                    }
                }
            });

            UI.showToast('Loaded store-specific margins', 'success');

        } catch (error) {
            console.error('Error loading store margins:', error);
        }
    },

    updateProductCalculations(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const quantity = parseInt(document.getElementById(`qty-${productId}`).value) || 1;
        const margin = parseFloat(document.getElementById(`margin-${productId}`).value) || 0;

        // Calculate distributor price: Rate = MRP - (MRP × margin%)
        const mrp = parseFloat(product.mrp || 0);
        const distributorPrice = mrp - (mrp * (margin / 100));
        const amount = distributorPrice * quantity;

        // Update display
        document.getElementById(`dist-price-${productId}`).textContent = `₹${distributorPrice.toFixed(2)}`;
        document.getElementById(`amount-${productId}`).textContent = `₹${amount.toFixed(2)}`;

        // Update in map
        this.selectedProducts.set(productId, { product, quantity, margin, distributorPrice, amount });

        this.updateInvoiceSummary();
    },

    updateInvoiceSummary() {
        let totalItems = 0;
        let totalQuantity = 0;
        let subtotal = 0;
        const hsnGroups = new Map();

        this.selectedProducts.forEach(({ product, quantity, distributorPrice, amount }) => {
            totalItems++;
            totalQuantity += quantity;
            subtotal += amount;

            // Group by HSN for GST calculation
            const hsnCode = product.hsnCode || 'NONE';
            const gstRate = parseFloat(product.gstRate || 0);

            if (!hsnGroups.has(hsnCode)) {
                hsnGroups.set(hsnCode, { amount: 0, gstRate });
            }
            hsnGroups.get(hsnCode).amount += amount;
        });

        // Calculate total GST (CGST + SGST)
        let totalCGST = 0;
        let totalSGST = 0;

        hsnGroups.forEach(({ amount, gstRate }) => {
            const cgst = amount * (gstRate / 100) / 2;
            const sgst = amount * (gstRate / 100) / 2;
            totalCGST += cgst;
            totalSGST += sgst;
        });

        const preRoundTotal = subtotal + totalCGST + totalSGST;
        const grandTotal = Math.round(preRoundTotal);
        const roundOff = grandTotal - preRoundTotal;

        // Update display
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalQuantity').textContent = totalQuantity;
        document.getElementById('subtotalDisplay').textContent = Utils.formatCurrency(subtotal);
        document.getElementById('gstDisplay').textContent = Utils.formatCurrency(totalCGST + totalSGST);
        document.getElementById('grandTotalDisplay').textContent = Utils.formatCurrency(grandTotal);

        // Store for saving
        this.invoiceTotals = {
            subtotal,
            cgstTotal: totalCGST,
            sgstTotal: totalSGST,
            roundOff,
            grandTotal
        };
    },

    async saveInvoice(shouldPrint = false) {
        const invoiceNo = document.getElementById('invoiceNo').value.trim();
        const invoiceDate = document.getElementById('invoiceDate').value;
        const storeSelect = document.getElementById('storeSelect');
        const selectedOption = storeSelect.selectedOptions[0];

        if (!invoiceNo) {
            UI.showToast('⚠️ Please scroll up and enter Invoice Number', 'error');
            document.getElementById('invoiceNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('invoiceNo')?.focus();
            return;
        }

        if (!storeSelect.value) {
            UI.showToast('⚠️ Please scroll up and select a Store', 'error');
            document.getElementById('storeSelect')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById('storeSelect')?.focus();
            return;
        }

        if (this.selectedProducts.size === 0) {
            UI.showToast('Please select at least one product', 'error');
            return;
        }

        // Prepare invoice data
        const invoiceData = {
            invoiceNo,
            orderDate: invoiceDate,
            storeId: parseInt(storeSelect.value),
            storeName: selectedOption.dataset.name,
            storeSerialNumber: selectedOption.dataset.storeid,
            storeAddress: [selectedOption.dataset.address1, selectedOption.dataset.address2].filter(Boolean).join(', '),
            storeGstin: selectedOption.dataset.gstin,
            storeState: selectedOption.dataset.area,
            storeStateCode: selectedOption.dataset.code,
            storePinCode: selectedOption.dataset.pincode,
            storeOrderPhone: selectedOption.dataset.orderphone,
            storeAccountsPhone: selectedOption.dataset.accountsphone,
            storeEmail: selectedOption.dataset.email,
            storeCategory: selectedOption.dataset.category,
            ...this.invoiceTotals,
            items: []
        };

        // Prepare items
        this.selectedProducts.forEach(({ product, quantity, margin, distributorPrice, amount }) => {
            const gstRate = parseFloat(product.gstRate || 0);
            const cgst = amount * (gstRate / 100) / 2;
            const sgst = amount * (gstRate / 100) / 2;
            const totalAmount = amount + cgst + sgst;

            invoiceData.items.push({
                productId: product.id,
                productName: product.productName,
                weight: product.weight,
                serialNumber: product.serialNumber,
                hsnCode: product.hsnCode,
                gstRate,
                mrp: parseFloat(product.mrp),
                quantity,
                unit: 'NOS',
                shippedQty: quantity,
                billedQty: quantity,
                distributorMargin: margin,
                distributorPrice,
                amount,
                cgst,
                sgst,
                totalAmount
            });
        });

        try {
            console.log('Sending invoice data:', invoiceData);

            const response = await fetch('/api/sales-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });

            const result = await response.json();
            console.log('Server response:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create invoice');
            }

            // Also create billing entry for payment tracking
            const billingData = {
                billNo: invoiceNo,
                storeName: selectedOption.dataset.name,
                salesCaptain: selectedOption.dataset.captain || 'Unknown',
                billDate: invoiceDate,
                billAmount: this.invoiceTotals.grandTotal,
                paymentAmount: 0,
                paymentMode: '',
                paymentDate: '',
                remarks: `Invoice ${invoiceNo} - Pending Payment`
            };

            console.log('Creating billing entry:', billingData);

            const billingResponse = await fetch('/api/billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billingData)
            });

            if (!billingResponse.ok) {
                console.error('Billing creation failed but continuing...');
            }

            UI.showToast(`✅ Invoice ${invoiceNo} created successfully! Added to billing for payment.`, 'success');

            // If Save & Print was clicked, print the invoice before resetting
            if (shouldPrint) {
                // Fetch the just-created invoice and print it
                const invoiceResponse = await fetch(`/api/sales-orders/${result.id}`);
                const invoiceData = await invoiceResponse.json();
                this.printInvoice(invoiceData);
            }

            this.render(); // Reset form
        } catch (error) {
            console.error('Error creating invoice:', error);
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },

    async viewInvoice(id) {
        try {
            const response = await fetch(`/api/sales-orders/${id}`);
            const invoice = await response.json();
            this.printInvoice(invoice);
        } catch (error) {
            console.error('Error loading invoice:', error);
            UI.showToast('Error loading invoice', 'error');
        }
    },

    async printInvoice(invoiceData) {
        // If passed an ID, fetch the invoice first
        if (typeof invoiceData === 'number') {
            try {
                const response = await fetch(`/api/sales-orders/${invoiceData}`);
                invoiceData = await response.json();
            } catch (error) {
                console.error('Error loading invoice:', error);
                UI.showToast('Error loading invoice', 'error');
                return;
            }
        }

        // Fetch settings for company details and logo
        let settings = {};
        try {
            const response = await fetch('/api/settings');
            settings = await response.json();
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Use defaults if settings fetch fails
            settings = {
                companyName: 'ARUNYA CONSUMABLES PRIVATE LIMITED',
                address: 'No. 14, Barnaby Road, Kilpauk, Chennai - 600 010',
                gstin: '33AAXCA3298E1ZC',
                state: 'Tamil Nadu',
                stateCode: '33'
            };
        }

        // Group items by HSN for tax summary
        const hsnGroups = new Map();
        invoiceData.items.forEach(item => {
            const hsnCode = item.hsnCode || 'NONE';
            if (!hsnGroups.has(hsnCode)) {
                hsnGroups.set(hsnCode, {
                    taxableAmount: 0,
                    cgst: 0,
                    sgst: 0,
                    gstRate: item.gstRate,
                    total: 0
                });
            }
            const group = hsnGroups.get(hsnCode);
            group.taxableAmount += item.amount;
            group.cgst += item.cgst;
            group.sgst += item.sgst;
            group.total += (item.cgst + item.sgst);
        });

        // Generate HSN summary table
        let hsnSummaryRows = '';
        hsnGroups.forEach((data, hsn) => {
            hsnSummaryRows += `
                <tr>
                    <td>${hsn}</td>
                    <td style="text-align: right;">₹${data.taxableAmount.toFixed(2)}</td>
                    <td style="text-align: center;">${(data.gstRate / 2).toFixed(2)}%</td>
                    <td style="text-align: right;">₹${data.cgst.toFixed(2)}</td>
                    <td style="text-align: center;">${(data.gstRate / 2).toFixed(2)}%</td>
                    <td style="text-align: right;">₹${data.sgst.toFixed(2)}</td>
                    <td style="text-align: right;">₹${data.total.toFixed(2)}</td>
                </tr>
            `;
        });

        // Create print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>Tax Invoice - ${invoiceData.invoiceNo}</title>
    <style>
        @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            padding: 20px;
        }
        .invoice-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
        .invoice-header h1 {
            font-size: 18px;
            margin-bottom: 5px;
        }
        .invoice-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
            border: 2px solid #000;
            padding: 5px;
        }
        .info-section {
            display: flex;
            border: 1px solid #000;
            margin-bottom: 10px;
        }
        .info-left, .info-right {
            flex: 1;
            padding: 10px;
        }
        .info-left {
            border-right: 1px solid #000;
        }
        .info-row {
            display: flex;
            margin-bottom: 3px;
        }
        .info-label {
            width: 120px;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 10px;
        }
        .products-table th {
            text-align: center;
        }
        .products-table td {
            font-size: 10px;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .total-section {
            margin-top: 10px;
        }
        .grand-total {
            font-size: 14px;
            font-weight: bold;
            padding: 10px;
            background-color: #f0f0f0;
        }
        .signature {
            margin-top: 30px;
            text-align: right;
            padding-right: 50px;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="invoice-header" style="display: flex; align-items: center; justify-content: space-between; text-align: left;">
        <div style="flex-shrink: 0;">
            <img src="${settings.logoPath ? window.location.origin + settings.logoPath : window.location.origin + '/public/assets/company-logo.jpg'}" alt="Logo" style="height: 70px;">
        </div>
        <div style="text-align: right; flex-grow: 1; padding-left: 20px;">
            <h1 style="margin: 0; font-size: 16px;">${settings.companyName || 'ARUNYA CONSUMABLES PRIVATE LIMITED'}</h1>
            <div style="font-size: 10px; margin-top: 4px;">${settings.address || 'No. 14, Barnaby Road, Kilpauk, Chennai - 600 010'}</div>
            <div style="font-size: 10px;">GSTIN/UIN: ${settings.gstin || '33AAXCA3298E1ZC'} | State: ${settings.state || 'Tamil Nadu'}, Code: ${settings.stateCode || '33'}</div>
            ${settings.phone ? `<div style="font-size: 10px;">Phone: ${settings.phone}</div>` : ''}
            ${settings.email ? `<div style="font-size: 10px;">Email: ${settings.email}</div>` : ''}
        </div>
    </div>

    <div class="invoice-title">Tax Invoice</div>

    <!-- Invoice & Buyer Details -->
    <div class="info-section">
        <div class="info-left">
            <div class="info-row">
                <div class="info-label">Invoice No:</div>
                <div>${invoiceData.invoiceNo}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Dated:</div>
                <div>${Utils.formatDateDDMMYYYY(invoiceData.orderDate)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Delivery Note Date:</div>
                <div>${Utils.formatDateDDMMYYYY(invoiceData.orderDate)}</div>
            </div>
            <div style="margin-top: 10px; font-weight: bold;">Buyer (Bill to):</div>
            <div style="margin-top: 5px;">
                <div style="font-weight: bold;">${invoiceData.storeName}</div>
                <div>${invoiceData.storeAddress || ''}</div>
                <div>GSTIN/UIN: ${invoiceData.storeGstin || 'N/A'}</div>
                <div>State: ${invoiceData.storeState || 'Tamil Nadu'}, Code: ${invoiceData.storeStateCode || '33'}</div>
            </div>
        </div>
        <div class="info-right">
            <div class="info-row">
                <div class="info-label">Mode/Terms:</div>
                <div>Cash/Credit</div>
            </div>
            <div class="info-row">
                <div class="info-label">Dispatched through:</div>
                <div>-</div>
            </div>
            <div class="info-row">
                <div class="info-label">Destination:</div>
                <div>${invoiceData.storeState || '-'}</div>
            </div>
        </div>
    </div>

    <!-- Products Table -->
    <table class="products-table">
        <thead>
            <tr>
                <th style="width: 30px;">Sl No.</th>
                <th>Description of Goods</th>
                <th style="width: 80px;">Weight</th>
                <th style="width: 80px;">HSN/SAC</th>
                <th style="width: 50px;">GST Rate</th>
                <th style="width: 80px;">MRP/Marginal</th>
                <th style="width: 60px;">Quantity Shipped</th>
                <th style="width: 60px;">Quantity Billed</th>
                <th style="width: 60px;">Rate</th>
                <th style="width: 80px;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoiceData.items.map((item, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.productName}</td>
                    <td class="text-center">${item.weight || '-'}</td>
                    <td class="text-center">${item.hsnCode || '-'}</td>
                    <td class="text-center">${item.gstRate || 0}%</td>
                    <td class="text-right">${item.mrp?.toFixed(2)}/NOS</td>
                    <td class="text-center">${item.shippedQty} NOS</td>
                    <td class="text-center">${item.billedQty} NOS</td>
                    <td class="text-right">${item.distributorPrice?.toFixed(2)}</td>
                    <td class="text-right">${item.amount?.toFixed(2)}</td>
                </tr>
            `).join('')}
            <tr>
                <td colspan="9" style="text-align: right; font-weight: bold;">Subtotal</td>
                <td class="text-right" style="font-weight: bold;">₹${invoiceData.subtotal?.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="9" style="text-align: right;">OUTPUT CGST ${invoiceData.cgstTotal > 0 ? '2.5%' : ''}</td>
                <td class="text-right">${invoiceData.cgstTotal?.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="9" style="text-align: right;">OUTPUT SGST ${invoiceData.sgstTotal > 0 ? '2.5%' : ''}</td>
                <td class="text-right">${invoiceData.sgstTotal?.toFixed(2)}</td>
            </tr>
            ${invoiceData.roundOff !== 0 ? `
            <tr>
                <td colspan="9" style="text-align: right;">ROUND OFF</td>
                <td class="text-right">${invoiceData.roundOff > 0 ? '' : '(-)'}${Math.abs(invoiceData.roundOff).toFixed(2)}</td>
            </tr>
            ` : ''}
        </tbody>
    </table>

    <!-- Grand Total -->
    <div class="grand-total">
        Total: ${invoiceData.items.reduce((sum, item) => sum + (item.shippedQty || 0), 0)} NOS | 
        Grand Total: ₹${invoiceData.grandTotal?.toFixed(2)}
    </div>

    <div style="margin-top: 10px; font-weight: bold;">
        Amount Chargeable (in words): INR ${this.numberToWords(invoiceData.grandTotal)} Only
    </div>

    <!-- HSN/SAC Summary -->
    <div style="margin-top: 20px;">
        <div style="font-weight: bold; margin-bottom: 5px;">Tax Summary (HSN/SAC)</div>
        <table>
            <thead>
                <tr>
                    <th>HSN/SAC</th>
                    <th style="text-align: right;">Taxable Amount</th>
                    <th style="text-align: center;">CGST Rate</th>
                    <th style="text-align: right;">CGST Amount</th>
                    <th style="text-align: center;">SGST Rate</th>
                    <th style="text-align: right;">SGST Amount</th>
                    <th style="text-align: right;">Total Tax Amount</th>
                </tr>
            </thead>
            <tbody>
                ${hsnSummaryRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td class="text-right">₹${invoiceData.subtotal?.toFixed(2)}</td>
                    <td></td>
                    <td class="text-right">₹${invoiceData.cgstTotal?.toFixed(2)}</td>
                    <td></td>
                    <td class="text-right">₹${invoiceData.sgstTotal?.toFixed(2)}</td>
                    <td class="text-right">₹${((invoiceData.cgstTotal || 0) + (invoiceData.sgstTotal || 0)).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    ${settings.bankName ? `
    <div style="margin-top: 20px;">
        <div style="font-weight: bold;">Company's Bank Details:</div>
        <div>Bank Name: ${settings.bankName}</div>
        <div>A/c No: ${settings.accountNo || ''}</div>
        <div>Branch & IFS Code: ${settings.branch || ''} ${settings.ifscCode || ''}</div>
    </div>
    ` : ''}

    ${settings.declaration ? `
    <div style="margin-top: 15px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
        <strong>Declaration:</strong><br>
        ${settings.declaration}
    </div>
    ` : ''}

    <div class="signature">
        <div style="margin-bottom: 50px;">For ${settings.companyName || 'ARUNYA CONSUMABLES PRIVATE LIMITED'}</div>
        <div>Authorised Signatory</div>
    </div>

    <div class="footer">
        This is a Computer Generated Invoice
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
        `);
        printWindow.document.close();
    },

    numberToWords(num) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

        if (num === 0) return 'Zero';

        const numStr = Math.floor(num).toString();
        const len = numStr.length;

        if (len > 9) return 'Number too large';

        const padded = numStr.padStart(9, '0');

        const crore = parseInt(padded.substr(0, 2));
        const lakh = parseInt(padded.substr(2, 2));
        const thousand = parseInt(padded.substr(4, 2));
        const hundred = parseInt(padded.substr(6, 1));
        const remainder = parseInt(padded.substr(7, 2));

        let words = '';

        if (crore > 0) {
            words += this.twoDigitWords(crore, ones, tens, teens) + ' Crore ';
        }
        if (lakh > 0) {
            words += this.twoDigitWords(lakh, ones, tens, teens) + ' Lakh ';
        }
        if (thousand > 0) {
            words += this.twoDigitWords(thousand, ones, tens, teens) + ' Thousand ';
        }
        if (hundred > 0) {
            words += ones[hundred] + ' Hundred ';
        }
        if (remainder > 0) {
            words += this.twoDigitWords(remainder, ones, tens, teens);
        }

        return words.trim();
    },

    twoDigitWords(num, ones, tens, teens) {
        if (num < 10) return ones[num];
        if (num >= 10 && num < 20) return teens[num - 10];
        return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
    },

    async deleteInvoice(id) {
        try {
            const response = await fetch(`/api/sales-orders/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');

            UI.showToast('Invoice deleted successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            UI.showToast('Error deleting invoice', 'error');
        }
    }
};

// Make Sales globally accessible for other modules
window.Sales = Sales;
