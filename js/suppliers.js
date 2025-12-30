// ================================
// Suppliers Module
// ================================

const Suppliers = {
    currentSuppliers: [],
    viewMode: 'list',
    editingSupplier: null,

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #008299; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/suppliers');
            this.currentSuppliers = await response.json();

            // Calculate stats
            const totalSuppliers = this.currentSuppliers.length;
            const activeSuppliers = this.currentSuppliers.filter(s => s.status === 'active' || !s.status).length;
            const cities = [...new Set(this.currentSuppliers.map(s => s.city).filter(Boolean))].length;

            contentArea.innerHTML = `
                <!-- Tableau-style Suppliers -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #008299;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">🏭</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Supplier Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Manage your product suppliers and terms</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="sup-tab-btn ${this.viewMode === 'list' ? 'active' : ''}" onclick="Suppliers.showList()">📋 List</button>
                            <button class="sup-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" onclick="Suppliers.showForm()" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">➕ ${this.editingSupplier ? 'Edit' : 'Add'}</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Suppliers', totalSuppliers.toString(), 'Registered in system', '#1f77b4', '🏭')}
                        ${this.renderKPI('Active', activeSuppliers.toString(), 'Currently operational', '#2ca02c', '✅')}
                        ${this.renderKPI('Cities', cities.toString(), 'Diverse locations', '#9467bd', '📍')}
                    </div>

                    <!-- Main Content -->
                    <div id="supplierContent">
                        ${this.viewMode === 'list' ? this.renderTable() : this.renderForm()}
                    </div>
                </div>

                <style>
                    .sup-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .sup-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .sup-tab-btn.active {
                        background: #008299;
                        border-color: #008299;
                        color: white;
                    }
                </style>
            `;

        } catch (error) {
            console.error('Suppliers render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading suppliers: ${error.message}</p>
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

    renderTable() {
        if (this.currentSuppliers.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666; background: white;">No suppliers found. Click "Add" to create your first supplier!</div>';
        }

        return `
            <div style="background: white; min-height: 400px;">
                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Supplier List (${this.currentSuppliers.length})</span>
                    <input type="text" id="supSearchInput" placeholder="Search suppliers..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background: #f8f9fa; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Code</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Supplier Name</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Contact</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Phone</th>
                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">City</th>
                                <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Status</th>
                                <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #008299;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.currentSuppliers.map((s, idx) => `
                                <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                    <td style="padding: 8px 12px; color: #008299; font-weight: 600;">${s.supplierCode || '-'}</td>
                                    <td style="padding: 8px 12px; font-weight: 500; color: #333;">${s.supplierName}</td>
                                    <td style="padding: 8px 12px; color: #666;">${s.contactPerson || '-'}</td>
                                    <td style="padding: 8px 12px; color: #666;">${s.phone || '-'}</td>
                                    <td style="padding: 8px 12px; color: #666;">${s.city || '-'}</td>
                                    <td style="padding: 8px 12px; text-align: center;">
                                        <span style="background: ${s.status === 'inactive' ? '#fde7e9' : '#dff6dd'}; 
                                                     color: ${s.status === 'inactive' ? '#d13438' : '#107c10'}; 
                                                     padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                            ${(s.status || 'active').toUpperCase()}
                                        </span>
                                    </td>
                                    <td style="padding: 8px 12px; text-align: center;">
                                        <button onclick="Suppliers.editSupplier(${s.id})" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 4px;">✏️</button>
                                        <button onclick="Suppliers.deleteSupplier(${s.id})" style="background: #fde7e9; border: 1px solid #f3d6d8; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #d13438;">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showList() {
        this.viewMode = 'list';
        this.editingSupplier = null;
        this.render();
    },

    showForm(supplier = null) {
        this.editingSupplier = supplier;
        this.viewMode = 'form';
        this.render();
    },

    renderForm() {
        const s = this.editingSupplier || {};

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">${s.id ? '✏️ Edit Supplier' : '➕ Add New Supplier'}</h2>
                </div>
                <div class="card-body">
                    <form id="supplierForm">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Supplier Code</label>
                                <input type="text" name="supplierCode" class="form-input" value="${s.supplierCode || ''}" placeholder="Auto-generated">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="form-label">Supplier Name *</label>
                                <input type="text" name="supplierName" class="form-input" value="${s.supplierName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Contact Person</label>
                                <input type="text" name="contactPerson" class="form-input" value="${s.contactPerson || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone</label>
                                <input type="tel" name="phone" class="form-input" value="${s.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${s.email || ''}">
                            </div>
                            <div class="form-group" style="grid-column: span 3;">
                                <label class="form-label">Address</label>
                                <textarea name="address" class="form-input" rows="2">${s.address || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">City</label>
                                <input type="text" name="city" class="form-input" value="${s.city || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">State</label>
                                <input type="text" name="state" class="form-input" value="${s.state || 'Tamil Nadu'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pin Code</label>
                                <input type="text" name="pinCode" class="form-input" value="${s.pinCode || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">GSTIN</label>
                                <input type="text" name="gstin" class="form-input" value="${s.gstin || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PAN Number</label>
                                <input type="text" name="panNumber" class="form-input" value="${s.panNumber || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Terms</label>
                                <select name="paymentTerms" class="form-input">
                                    <option value="Net 30" ${s.paymentTerms === 'Net 30' ? 'selected' : ''}>Net 30</option>
                                    <option value="Net 15" ${s.paymentTerms === 'Net 15' ? 'selected' : ''}>Net 15</option>
                                    <option value="Net 7" ${s.paymentTerms === 'Net 7' ? 'selected' : ''}>Net 7</option>
                                    <option value="Immediate" ${s.paymentTerms === 'Immediate' ? 'selected' : ''}>Immediate</option>
                                </select>
                            </div>
                        </div>
                        
                        <h3 style="margin: 1.5rem 0 1rem; font-weight: 600; color: #0f172a;">🏦 Bank Details</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Bank Name</label>
                                <input type="text" name="bankName" class="form-input" value="${s.bankName || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Account Number</label>
                                <input type="text" name="accountNo" class="form-input" value="${s.accountNo || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">IFSC Code</label>
                                <input type="text" name="ifscCode" class="form-input" value="${s.ifscCode || ''}">
                            </div>
                        </div>

                        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn btn-primary">💾 ${s.id ? 'Update' : 'Save'} Supplier</button>
                            <button type="button" class="btn btn-secondary" onclick="Suppliers.cancelForm()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    cancelForm() {
        this.viewMode = 'list';
        this.editingSupplier = null;
        this.render();
    },

    async editSupplier(id) {
        const supplier = this.currentSuppliers.find(s => s.id === id);
        if (supplier) {
            this.showForm(supplier);
        }
    },

    async deleteSupplier(id) {
        if (!confirm('Are you sure you want to delete this supplier?')) return;

        try {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            UI.showToast('Supplier deleted successfully', 'success');
            this.render();
        } catch (error) {
            UI.showToast('Error deleting supplier', 'error');
        }
    },

    async saveSupplier(formData) {
        const id = this.editingSupplier?.id;
        const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
        const method = id ? 'PUT' : 'POST';

        try {
            // Get next code if not provided
            if (!formData.supplierCode && !id) {
                const codeResponse = await fetch('/api/suppliers/next/code');
                const { nextCode } = await codeResponse.json();
                formData.supplierCode = nextCode;
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Save failed');

            UI.showToast(`Supplier ${id ? 'updated' : 'created'} successfully`, 'success');
            this.cancelForm();
        } catch (error) {
            UI.showToast('Error saving supplier', 'error');
        }
    }
};

// Form submission handler
document.addEventListener('submit', function (e) {
    if (e.target.id === 'supplierForm') {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(e.target));
        Suppliers.saveSupplier(formData);
    }
});
