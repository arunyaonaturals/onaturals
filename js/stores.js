// ================================
// Stores Module - Tableau-style Design
// ================================

const Stores = {
    currentStores: [],
    currentProducts: [],
    currentMargins: [],
    selectedStoreId: null,
    viewMode: 'list', // 'list', 'manage', 'margins', 'beat', or 'form'
    editingStore: null,

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #3182ce; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/stores');
            this.currentStores = await response.json();

            // Calculate stats
            const totalStores = this.currentStores.length;
            const areas = [...new Set(this.currentStores.map(s => s.area).filter(Boolean))].length;
            const captains = [...new Set(this.currentStores.map(s => s.salesCaptain).filter(Boolean))].length;

            contentArea.innerHTML = `
                <!-- Tableau-style Stores -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3182ce;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">🏪</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Store Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Manage your distribution stores</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="store-tab-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">📋 List</button>
                            <button class="store-tab-btn ${this.viewMode === 'margins' ? 'active' : ''}" data-view="margins" style="${this.viewMode === 'margins' ? 'background: #9333ea; border-color: #9333ea;' : ''}">💰 Margins</button>
                            <button class="store-tab-btn" id="importJsonBtn" style="background: #ff7f0e; border-color: #ff7f0e; color: white;">📥 Import JSON</button>
                            <button class="store-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" data-view="form" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">${this.editingStore ? '✏️ Edit' : '➕ Add'}</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Stores', totalStores.toString(), 'Active outlets', '#3182ce', '🏪')}
                        ${this.renderKPI('Coverage Areas', areas.toString(), 'Unique areas', '#ff7f0e', '📍')}
                        ${this.renderKPI('Sales Captains', captains.toString(), 'Team members', '#9467bd', '👤')}
                    </div>

                    <!-- Main Content -->
                    <div id="storeContent">
                        ${this.viewMode === 'list' ? this.renderListView() :
                    this.viewMode === 'margins' ? this.renderMarginsView() :
                        this.renderAddStoreForm()}
                    </div>
                </div>

                <style>
                    .store-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .store-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .store-tab-btn.active {
                        background: #3182ce;
                        border-color: #3182ce;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Stores render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading stores: ${error.message}</p>
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
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 All Stores (${this.currentStores.length})</span>
                    <input type="text" id="searchInput" placeholder="Search stores..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;" id="storesTable">
                    ${this.renderTableContent(this.currentStores)}
                </div>
            </div>
        `;
    },

    renderTableContent(stores) {
        if (stores.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No stores found. Click "Add" to create your first store!</div>';
        }

        const categoryColors = {
            'CLASS A': '#48bb78',
            'CLASS B': '#4299e1',
            'CLASS C': '#f59e0b',
            'CLASS D': '#ef4444'
        };

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Store ID</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Store Name</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Area</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Category</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Sales Captain</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #3182ce;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${stores.map((s, idx) => `
                        <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                            <td style="padding: 8px 12px; color: #3182ce; font-weight: 500;">${s.storeId || '#' + s.id}</td>
                            <td style="padding: 8px 12px; font-weight: 500; color: #333;">${s.storeName}</td>
                            <td style="padding: 8px 12px; color: #666;">${s.area || '-'}</td>
                            <td style="padding: 8px 12px; text-align: center;">
                                ${s.storeCategory ? `<span style="background: ${categoryColors[s.storeCategory] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">${s.storeCategory}</span>` : '-'}
                            </td>
                            <td style="padding: 8px 12px; color: #666;">${s.salesCaptain || '-'}</td>
                            <td style="padding: 8px 12px; text-align: center;">
                                <button data-action="edit" data-id="${s.id}" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 4px;">✏️</button>
                                <button data-action="delete" data-id="${s.id}" style="background: #fde7e9; border: 1px solid #f3d6d8; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer; color: #d13438;">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderBeatView() {
        // Get unique areas from stores for autocomplete
        const storeAreas = [...new Set(this.currentStores.map(s => s.area).filter(Boolean))].sort();

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">🚶 Beat Management</h2>
                    <button class="btn btn-primary" id="addBeatBtn">➕ Add Beat</button>
                </div>
                <div class="card-body">
                    <div id="beatsContainer">
                        <div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading beats...</p></div>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Beat Form (hidden by default) -->
            <div id="beatFormCard" style="display: none; margin-top: 1rem;">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title" id="beatFormTitle">➕ Add New Beat</h2>
                        <button class="btn btn-secondary" id="cancelBeatBtn">✕ Cancel</button>
                    </div>
                    <div class="card-body">
                        <form id="beatForm">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                                <div class="form-group">
                                    <label class="form-label">Beat Name *</label>
                                    <input type="text" name="beatName" class="form-input" placeholder="e.g., Beat 1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Salesman</label>
                                    <input type="text" name="salesman" class="form-input" placeholder="Sales Captain name">
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-top: 1rem;">
                                <label class="form-label">Areas (type to search, press Enter to add)</label>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; min-height: 50px; background: #f9fafb;" id="areaTagsContainer">
                                    <input type="text" id="areaInput" class="form-input" placeholder="Type area name..." 
                                        style="border: none; background: transparent; flex: 1; min-width: 150px; padding: 0.25rem;" 
                                        list="areasList" autocomplete="off">
                                </div>
                                <datalist id="areasList">
                                    ${storeAreas.map(area => `<option value="${area}">`).join('')}
                                </datalist>
                                <input type="hidden" name="areas" id="areasHidden">
                                <small style="color: #6b7280;">Available areas from stores: ${storeAreas.slice(0, 5).join(', ')}${storeAreas.length > 5 ? '...' : ''}</small>
                            </div>
                            
                            <div style="margin-top: 1rem;">
                                <button type="submit" class="btn btn-primary" id="saveBeatBtn">💾 Save Beat</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    selectedAreas: [], // Track selected areas for the form


    async loadBeats() {
        try {
            const response = await fetch('/api/beats');
            this.beats = await response.json();
            this.renderBeatsTable();
        } catch (error) {
            console.error('Error loading beats:', error);
            document.getElementById('beatsContainer').innerHTML = `<div class="empty-state"><p>Error loading beats</p></div>`;
        }
    },

    renderBeatsTable() {
        const container = document.getElementById('beatsContainer');
        if (!container) return;

        if (!this.beats || this.beats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚶</div>
                    <p>No beats defined yet. Click "Add Beat" to create your first beat!</p>
                </div>
            `;
            return;
        }

        // Group stores by beat for count
        const beatStoreCounts = {};
        this.currentStores.forEach(store => {
            const beat = store.beat || 'Unassigned';
            beatStoreCounts[beat] = (beatStoreCounts[beat] || 0) + 1;
        });

        container.innerHTML = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Beat Name</th>
                            <th>Salesman</th>
                            <th>Areas</th>
                            <th>Stores</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.beats.map(beat => `
                            <tr>
                                <td style="font-weight: 600;">
                                    <span style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); color: white; padding: 0.25rem 0.75rem; border-radius: 0.5rem;">
                                        🚶 ${beat.beatName}
                                    </span>
                                </td>
                                <td>${beat.salesman || '-'}</td>
                                <td>${beat.areas || '-'}</td>
                                <td>
                                    <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">
                                        ${beatStoreCounts[beat.beatName] || 0}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-secondary btn-sm" data-action="edit-beat" data-id="${beat.id}">✏️</button>
                                        <button class="btn btn-danger btn-sm" data-action="delete-beat" data-id="${beat.id}">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.attachBeatActions();
    },

    attachBeatActions() {
        const self = this; // Store reference to avoid context issues

        document.querySelectorAll('[data-action="edit-beat"]').forEach(btn => {
            btn.onclick = function (e) {
                const id = parseInt(this.dataset.id);
                self.editBeat(id);
            };
        });

        document.querySelectorAll('[data-action="delete-beat"]').forEach(btn => {
            btn.onclick = async function (e) {
                const id = parseInt(this.dataset.id);
                if (confirm('Delete this beat?')) {
                    await self.deleteBeat(id);
                }
            };
        });
    },

    showBeatForm(beat = null) {
        const formCard = document.getElementById('beatFormCard');
        const form = document.getElementById('beatForm');
        const title = document.getElementById('beatFormTitle');

        formCard.style.display = 'block';
        title.textContent = beat ? '✏️ Edit Beat' : '➕ Add New Beat';

        // Populate form
        form.querySelector('[name="beatName"]').value = beat?.beatName || '';
        form.querySelector('[name="salesman"]').value = beat?.salesman || '';

        // Handle areas with tags
        this.selectedAreas = beat?.areas ? beat.areas.split(',').map(a => a.trim()).filter(Boolean) : [];
        this.renderAreaTags();
        this.updateAreaDatalist();

        this.editingBeat = beat;

        // Setup area input handlers
        this.setupAreaInputHandlers();
    },

    setupAreaInputHandlers() {
        const areaInput = document.getElementById('areaInput');
        if (!areaInput) return;

        // Handle Enter key to add area
        areaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addAreaTag(areaInput.value.trim());
                areaInput.value = '';
            }
        });

        // Handle selecting from datalist
        areaInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            // Check if this matches an option exactly (selected from datalist)
            const datalist = document.getElementById('areasList');
            const options = Array.from(datalist?.options || []).map(o => o.value);
            if (options.includes(value) && !this.selectedAreas.includes(value)) {
                this.addAreaTag(value);
                areaInput.value = '';
            }
        });
    },

    addAreaTag(area) {
        if (!area || this.selectedAreas.includes(area)) return;
        this.selectedAreas.push(area);
        this.renderAreaTags();
        this.updateAreaDatalist();
    },

    removeAreaTag(area) {
        this.selectedAreas = this.selectedAreas.filter(a => a !== area);
        this.renderAreaTags();
        this.updateAreaDatalist();
    },

    renderAreaTags() {
        const container = document.getElementById('areaTagsContainer');
        if (!container) return;

        // Keep the input, remove old tags
        const input = container.querySelector('#areaInput');
        container.innerHTML = '';

        // Add tags
        this.selectedAreas.forEach(area => {
            const tag = document.createElement('span');
            tag.style.cssText = 'background: #4299e1; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.25rem;';
            tag.innerHTML = `${area} <span style="cursor: pointer; font-weight: bold;" data-remove-area="${area}">×</span>`;
            container.appendChild(tag);
        });

        // Re-add the input
        if (input) {
            container.appendChild(input);
        } else {
            const newInput = document.createElement('input');
            newInput.type = 'text';
            newInput.id = 'areaInput';
            newInput.className = 'form-input';
            newInput.placeholder = 'Type area name...';
            newInput.style.cssText = 'border: none; background: transparent; flex: 1; min-width: 150px; padding: 0.25rem;';
            newInput.setAttribute('list', 'areasList');
            newInput.autocomplete = 'off';
            container.appendChild(newInput);
            this.setupAreaInputHandlers();
        }

        // Update hidden field
        const hidden = document.getElementById('areasHidden');
        if (hidden) hidden.value = this.selectedAreas.join(', ');

        // Attach remove handlers
        container.querySelectorAll('[data-remove-area]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeAreaTag(e.target.dataset.removeArea);
            });
        });
    },

    updateAreaDatalist() {
        const datalist = document.getElementById('areasList');
        if (!datalist) return;

        // Get all store areas
        const allAreas = [...new Set(this.currentStores.map(s => s.area).filter(Boolean))].sort();
        // Filter out already selected
        const availableAreas = allAreas.filter(a => !this.selectedAreas.includes(a));

        datalist.innerHTML = availableAreas.map(area => `<option value="${area}">`).join('');
    },

    hideBeatForm() {
        document.getElementById('beatFormCard').style.display = 'none';
        this.editingBeat = null;
        this.selectedAreas = [];
    },

    editBeat(id) {
        const beat = this.beats.find(b => b.id === id);
        if (beat) this.showBeatForm(beat);
    },

    async saveBeat() {
        const form = document.getElementById('beatForm');
        const formData = new FormData(form);
        const beatData = Object.fromEntries(formData);

        try {
            let url = '/api/beats';
            let method = 'POST';

            if (this.editingBeat) {
                url = `/api/beats/${this.editingBeat.id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(beatData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Save failed');
            }

            UI.showToast(this.editingBeat ? '✅ Beat updated!' : '✅ Beat added!', 'success');
            this.hideBeatForm();
            await this.loadBeats();
        } catch (error) {
            console.error('Error saving beat:', error);
            UI.showToast(error.message || 'Error saving beat', 'error');
        }
    },

    async deleteBeat(id) {
        try {
            await fetch(`/api/beats/${id}`, { method: 'DELETE' });
            UI.showToast('✅ Beat deleted!', 'success');
            await this.loadBeats();
        } catch (error) {
            console.error('Error deleting beat:', error);
            UI.showToast('Error deleting beat', 'error');
        }
    },


    renderManageView() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">⚙️ Manage Stores</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary" id="importStoresBtn">📤 Import</button>
                        <button class="btn btn-danger" id="clearStoresBtn">🗑️ Clear All</button>
                        <button class="btn btn-primary" id="addStoreBtn">➕ Add Store</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 1rem;">
                        ${UI.createSearchBar('Search stores by name, area...')}
                    </div>
                    <div id="storeCards" class="store-cards-grid">
                        ${this.renderStoreCards(this.currentStores)}
                    </div>
                </div>
            </div>
        `;
    },

    renderAddStoreForm() {
        const s = this.editingStore;
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">${s ? '✏️ Edit Store' : '➕ Add New Store'}</h2>
                    <button class="btn btn-secondary" data-view="list">← Back to List</button>
                </div>
                <div class="card-body">
                    <form id="storeForm">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Store Name *</label>
                                <input type="text" name="storeName" class="form-input" value="${s?.storeName || ''}" placeholder="Enter store name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Store ID</label>
                                <input type="text" name="storeId" class="form-input" value="${s?.storeId || ''}" placeholder="e.g., ST001">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Area *</label>
                                <input type="text" name="area" class="form-input" value="${s?.area || ''}" placeholder="Enter area" required>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="form-label">Address Line 1</label>
                                <input type="text" name="addressLine1" class="form-input" value="${s?.addressLine1 || s?.address || ''}" placeholder="Building, Street">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Pin Code</label>
                                <input type="text" name="pinCode" class="form-input" value="${s?.pinCode || ''}" placeholder="e.g., 600001">
                            </div>
                            <div class="form-group" style="grid-column: span 3;">
                                <label class="form-label">Address Line 2</label>
                                <input type="text" name="addressLine2" class="form-input" value="${s?.addressLine2 || ''}" placeholder="City, State">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Order Phone No.</label>
                                <input type="tel" name="orderPhone" class="form-input" value="${s?.orderPhone || s?.phone1 || ''}" placeholder="Order phone">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Accounts Phone Number</label>
                                <input type="tel" name="accountsPhone" class="form-input" value="${s?.accountsPhone || s?.phone2 || ''}" placeholder="Accounts phone">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <input type="email" name="email" class="form-input" value="${s?.email || ''}" placeholder="store@example.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">GST Number</label>
                                <input type="text" name="gstNumber" class="form-input" value="${s?.gstNumber || ''}" placeholder="e.g., 33AABCU9603R1ZM">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Store Category</label>
                                <select name="storeCategory" class="form-select">
                                    <option value="">-- Select Category --</option>
                                    <option value="CLASS A" ${s?.storeCategory === 'CLASS A' ? 'selected' : ''}>CLASS A (>50k)</option>
                                    <option value="CLASS B" ${s?.storeCategory === 'CLASS B' ? 'selected' : ''}>CLASS B (40-50k)</option>
                                    <option value="CLASS C" ${s?.storeCategory === 'CLASS C' ? 'selected' : ''}>CLASS C (30-40k)</option>
                                    <option value="CLASS D" ${s?.storeCategory === 'CLASS D' ? 'selected' : ''}>CLASS D (<30k)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Sales Captain</label>
                                <input type="text" name="salesCaptain" class="form-input" value="${s?.salesCaptain || ''}" placeholder="Sales Captain">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Beat</label>
                                <input type="text" name="beat" class="form-input" value="${s?.beat || ''}" placeholder="Beat">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Distributor</label>
                                <input type="text" name="distributor" class="form-input" value="${s?.distributor || ''}" placeholder="Distributor">
                            </div>
                        </div>
                        <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
                            <button type="submit" class="btn btn-primary">${s ? '💾 Update Store' : '➕ Add Store'}</button>
                            <button type="button" class="btn btn-secondary" data-view="list">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },




    renderStoreCards(stores) {
        if (stores.length === 0) {
            return `<div style="text-align: center; padding: 3rem; color: var(--gray-500);">
                <p style="font-size: 3rem; margin-bottom: 1rem;">🏪</p>
                <p>No stores found. Add your first store!</p>
            </div>`;
        }

        return stores.map(store => `
            <div class="store-card" data-store-id="${store.id}">
                <div class="store-card-header">
                    <div class="store-card-title">
                        <span class="store-number">${store.storeId || '#' + store.id}</span>
                        <h3>${store.storeName || 'Unnamed Store'}</h3>
                        ${store.storeCategory ? `<span style="background: ${store.storeCategory === 'CLASS A' ? '#48bb78' : store.storeCategory === 'CLASS B' ? '#4299e1' : store.storeCategory === 'CLASS C' ? '#f59e0b' : '#ef4444'}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${store.storeCategory}</span>` : ''}
                    </div>
                    <div class="store-card-actions">
                        <button class="btn-icon" data-action="edit" data-id="${store.id}" title="Edit">✏️</button>
                        <button class="btn-icon btn-danger" data-action="delete" data-id="${store.id}" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="store-card-body">
                    <div class="store-info-grid">
                        <div class="store-info-item">
                            <span class="info-label">📍 Area</span>
                            <span class="info-value">${store.area || '-'}</span>
                        </div>
                        <div class="store-info-item">
                            <span class="info-label">👤 Sales Captain</span>
                            <span class="info-value">${store.salesCaptain || '-'}</span>
                        </div>
                        <div class="store-info-item">
                            <span class="info-label">🛤️ Beat</span>
                            <span class="info-value">${store.beat || '-'}</span>
                        </div>
                        <div class="store-info-item">
                            <span class="info-label">🏢 Distributor</span>
                            <span class="info-value">${store.distributor || '-'}</span>
                        </div>
                    </div>
                    
                    <div class="store-address-section">
                        <span class="info-label">🏠 Address</span>
                        <p class="address-text">${[store.addressLine1, store.addressLine2].filter(Boolean).join(', ') || store.address || 'No address added'}</p>
                        ${store.pinCode ? `<p class="address-text" style="margin-top: 0.25rem;"><strong>PIN:</strong> ${store.pinCode}</p>` : ''}
                    </div>
                    
                    <div class="store-contact-section">
                        <div class="contact-item">
                            <span class="info-label">📞 Order Phone</span>
                            <span class="info-value phone">${store.orderPhone || store.phone1 || '-'}</span>
                        </div>
                        <div class="contact-item">
                            <span class="info-label">📞 Accounts Phone</span>
                            <span class="info-value phone">${store.accountsPhone || store.phone2 || '-'}</span>
                        </div>
                        <div class="contact-item">
                            <span class="info-label">📧 Email</span>
                            <span class="info-value">${store.email || '-'}</span>
                        </div>
                        <div class="contact-item">
                            <span class="info-label">🧾 GST</span>
                            <span class="info-value gst">${store.gstNumber || '-'}</span>
                        </div>
                    </div>
                </div>
        `).join('');
    },

    renderTable(stores) {
        // List view - minimal columns, inline edit shows all fields
        const listColumns = [
            { field: 'storeId', label: 'Store ID', formatter: (v, row) => v || '#' + row.id },
            { field: 'storeName', label: 'Store Name' },
            { field: 'area', label: 'Area' },
            {
                field: 'storeCategory', label: 'Category', formatter: (v) => {
                    if (!v) return '-';
                    const colors = {
                        'CLASS A': '#48bb78',
                        'CLASS B': '#4299e1',
                        'CLASS C': '#f59e0b',
                        'CLASS D': '#ef4444'
                    };
                    return `<span style="background: ${colors[v] || '#6b7280'}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">${v}</span>`;
                }
            },
            { field: 'salesCaptain', label: 'Sales Captain' }
        ];

        const actions = [
            { label: '✏️', action: 'edit', type: 'secondary' },
            { label: '🗑️', action: 'delete', type: 'danger' }
        ];

        return UI.createTable(listColumns, stores, actions);
    },

    attachEventListeners() {
        // View switching via data-view attribute
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newView = e.target.dataset.view;
                if (newView === 'form' && this.viewMode !== 'form') {
                    this.editingStore = null; // Reset for new store
                }
                this.viewMode = newView;
                this.render();
            });
        });

        // Margins view specific listeners
        if (this.viewMode === 'margins') {
            this.attachMarginsEventListeners();
        }

        // Beat view specific listeners
        if (this.viewMode === 'beat') {
            this.loadBeats();

            document.getElementById('addBeatBtn')?.addEventListener('click', () => {
                this.showBeatForm();
            });

            document.getElementById('cancelBeatBtn')?.addEventListener('click', () => {
                this.hideBeatForm();
            });

            document.getElementById('beatForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveBeat();
            });
        }

        // Add store button (in manage view - now switches to form view)
        document.getElementById('addStoreBtn')?.addEventListener('click', () => {
            this.editingStore = null;
            this.viewMode = 'form';
            this.render();
        });

        // Import Data button (only in manage view)
        document.getElementById('importStoresBtn')?.addEventListener('click', () => {
            this.showImportSection();
        });

        // Import JSON button (in header)
        document.getElementById('importJsonBtn')?.addEventListener('click', () => {
            this.showJsonImportDialog();
        });

        // Clear All button (only in manage view)
        document.getElementById('clearStoresBtn')?.addEventListener('click', async () => {
            if (confirm('Delete ALL stores? This cannot be undone.')) {
                await this.clearAllStores();
            }
        });

        // Store form submission
        document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveStoreFromForm();
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = this.currentStores.filter(store =>
                    Utils.searchInObject(store, searchTerm)
                );

                if (this.viewMode === 'manage') {
                    document.getElementById('storeCards').innerHTML = this.renderStoreCards(filtered);
                } else if (this.viewMode === 'list') {
                    document.getElementById('storesTable').innerHTML = this.renderTable(filtered);
                }
                this.attachTableActions();
            }, 300));
        }

        this.attachTableActions();
    },

    async saveStoreFromForm() {
        const form = document.getElementById('storeForm');
        const formData = new FormData(form);
        const storeData = Object.fromEntries(formData);

        try {
            let url = '/api/stores';
            let method = 'POST';

            if (this.editingStore) {
                url = `/api/stores/${this.editingStore.id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeData)
            });

            if (!response.ok) throw new Error('Save failed');

            UI.showToast(this.editingStore ? '✅ Store updated!' : '✅ Store added!', 'success');
            this.editingStore = null;
            this.viewMode = 'list';
            this.render();
        } catch (error) {
            console.error('Error saving store:', error);
            UI.showToast('Error saving store', 'error');
        }
    },

    showImportSection() {
        // Show inline import instead of modal
        const content = document.getElementById('storeContent');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📤 Import Stores from CSV</h2>
                    <button class="btn btn-secondary" data-view="manage">← Back</button>
                </div>
                <div class="card-body">
                    <p style="margin-bottom: 1rem; color: #6b7280;">
                        Upload a CSV file with columns: <strong>storeName, area, address, phone1, phone2, gstNumber, distributor, salesCaptain, beat</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <input type="file" id="fileInput" accept=".csv" class="form-input" style="flex: 1;">
                        <button class="btn btn-primary" id="doImportBtn">📤 Import</button>
                    </div>
                </div>
            </div>
        `;

        content.querySelector('[data-view="manage"]').addEventListener('click', () => {
            this.viewMode = 'manage';
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


    attachTableActions() {
        // Edit buttons
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editStore(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Are you sure you want to delete this store?')) {
                    await this.deleteStore(id);
                }
            });
        });
    },

    editStore(id) {
        const store = this.currentStores.find(s => s.id === id);
        if (store) {
            this.editingStore = store;
            this.viewMode = 'form';
            this.render();
        }
    },

    async deleteStore(id) {
        try {
            const response = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');

            UI.showToast('Store deleted successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting store:', error);
            UI.showToast('Error deleting store', 'error');
        }
    },


    async deleteStore(id) {
        try {
            const response = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');

            UI.showToast('Store deleted successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting store:', error);
            UI.showToast('Error deleting store', 'error');
        }
    },

    async clearAllStores() {
        try {
            const response = await fetch('/api/stores', { method: 'DELETE' });
            if (!response.ok) throw new Error('Clear failed');

            UI.showToast('All stores cleared successfully', 'success');
            this.render();
        } catch (error) {
            console.error('Error clearing stores:', error);
            UI.showToast('Error clearing stores', 'error');
        }
    },

    showImportDialog() {
        const content = `
            <div>
                <p style="margin-bottom: var(--spacing-lg); color: var(--gray-700);">
                    Upload a CSV or JSON file with the store data.<br>
                    <small>Supported formats: .csv, .json</small>
                </p>
                <input type="file" id="fileInput" accept=".csv, .json" class="form-input">
            </div>
        `;

        const buttons = [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: 'Import', type: 'primary', action: 'import' }
        ];

        UI.createModal('Import Stores', content, buttons);

        document.querySelector('[data-action="import"]')?.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];

            if (!file) {
                UI.showToast('Please select a file', 'error');
                return;
            }

            if (file.name.endsWith('.json')) {
                this.importJSON(file);
            } else if (file.name.endsWith('.csv')) {
                this.importCSV(file);
            } else {
                UI.showToast('Unsupported file format. Please upload .csv or .json', 'error');
            }
        });
    },

    showJsonImportDialog() {
        const content = `
            <div>
                <p style="margin-bottom: 16px; color: #555;">
                    Upload a JSON file with the store data.<br>
                    <small style="color: #888;">Format: Array of store objects with fields like storeName, storeId, area, etc.</small>
                </p>
                <div style="border: 2px dashed #ccc; border-radius: 8px; padding: 30px; text-align: center; background: #f9f9f9;">
                    <input type="file" id="jsonFileInput" accept=".json" style="display: none;">
                    <button id="selectJsonFileBtn" style="background: #3182ce; color: white; border: none; padding: 10px 24px; border-radius: 5px; cursor: pointer; font-size: 14px;">📁 Select JSON File</button>
                    <p id="selectedFileName" style="margin-top: 12px; color: #666; font-size: 12px;">No file selected</p>
                </div>
            </div>
        `;

        const buttons = [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: '📥 Import', type: 'primary', action: 'import-json' }
        ];

        UI.createModal('Import Stores from JSON', content, buttons);

        // Handle file selection button
        document.getElementById('selectJsonFileBtn')?.addEventListener('click', () => {
            document.getElementById('jsonFileInput')?.click();
        });

        // Handle file input change
        document.getElementById('jsonFileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('selectedFileName').textContent = `Selected: ${file.name}`;
                document.getElementById('selectedFileName').style.color = '#2ca02c';
            }
        });

        // Handle import button
        document.querySelector('[data-action="import-json"]')?.addEventListener('click', () => {
            const fileInput = document.getElementById('jsonFileInput');
            const file = fileInput.files[0];

            if (!file) {
                UI.showToast('Please select a JSON file', 'error');
                return;
            }

            if (!file.name.endsWith('.json')) {
                UI.showToast('Please select a .json file', 'error');
                return;
            }

            this.importJSON(file);
            UI.closeModal();
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

            this.sendBatchData(data);

        } catch (error) {
            console.error('Error importing CSV:', error);
            UI.showToast('Error importing CSV file', 'error');
        }
    },

    async importJSON(file) {
        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                UI.showToast('Invalid JSON format', 'error');
                return;
            }

            if (!Array.isArray(data) || data.length === 0) {
                UI.showToast('JSON must be a non-empty array', 'error');
                return;
            }

            this.sendBatchData(data);

        } catch (error) {
            console.error('Error importing JSON:', error);
            UI.showToast('Error importing JSON file', 'error');
        }
    },

    async sendBatchData(data) {
        try {
            const response = await fetch('/api/stores/batch', {
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
            console.error('Error batch importing:', error);
            UI.showToast('Error importing data: ' + error.message, 'error');
        }
    },

    // =====================================
    // Product Margins View
    // =====================================

    renderMarginsView() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Manage Product Margins by Store</h2>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: var(--spacing-lg);">
                        <label class="form-label">Select Store:</label>
                        <select id="storeSelector" class="form-input" style="max-width: 400px;">
                            <option value="">-- Select a store --</option>
                            ${this.currentStores.map(store => `
                                <option value="${store.id}" ${this.selectedStoreId == store.id ? 'selected' : ''}>
                                    ${store.storeName} (${store.area || 'N/A'})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div id="marginsContent">
                        ${this.selectedStoreId ? this.renderMarginsTable() : '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">Please select a store to manage product margins</p>'}
                    </div>
                </div>
            </div>
        `;
    },

    renderMarginsTable() {
        if (!this.selectedStoreId || this.currentProducts.length === 0) {
            return '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">No products available</p>';
        }

        return `
            <!-- Bulk Margin Controls -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0369a1;">⚡ Quick Bulk Margin Setting</h3>
                
                <!-- Quick Margin Buttons -->
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 12px; color: #64748b; line-height: 32px; min-width: 100px;">Quick Set All:</span>
                    <button class="bulk-margin-btn" data-margin="10" style="background: #10b981; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">10%</button>
                    <button class="bulk-margin-btn" data-margin="15" style="background: #3b82f6; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">15%</button>
                    <button class="bulk-margin-btn" data-margin="20" style="background: #8b5cf6; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">20%</button>
                    <button class="bulk-margin-btn" data-margin="25" style="background: #f59e0b; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">25%</button>
                    <button class="bulk-margin-btn" data-margin="30" style="background: #ef4444; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">30%</button>
                </div>
                
                <!-- Custom Margin Input -->
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: #64748b; min-width: 100px;">Custom Margin:</span>
                    <input type="number" id="bulkMarginInput" placeholder="Enter %" min="0" max="100" step="0.5" 
                        style="width: 80px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: center;">
                    <button id="applyBulkMarginBtn" style="background: #0ea5e9; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Apply to All</button>
                    <button id="clearAllMarginsBtn" style="background: #64748b; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear All</button>
                </div>
            </div>
            
            <div style="margin-bottom: var(--spacing-md); display: flex; justify-content: space-between; align-items: center;">
                <p style="color: var(--gray-600);">Set custom margins for each product at this store. Leave blank to use the default product margin (0%).</p>
                <button class="btn btn-primary" id="saveMarginsBtn">💾 Save Margins</button>
            </div>
            
            <div style="overflow-x: auto;">
                <table class="data-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Weight</th>
                            <th>MRP (₹)</th>
                            <th>Default Margin (%)</th>
                            <th>Store-Specific Margin (%)</th>
                            <th>Effective Margin (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentProducts.map(product => {
            const customMargin = product.customMargin !== null && product.customMargin !== undefined ? product.customMargin : '';
            const effectiveMargin = product.effectiveMargin || product.defaultMargin || 0;
            return `
                                <tr data-product-id="${product.productId}">
                                    <td><strong>${product.productName || 'N/A'}</strong></td>
                                    <td>${product.weight || '-'}</td>
                                    <td>${Utils.formatCurrency(product.mrp)}</td>
                                    <td style="text-align: center;">${product.defaultMargin ? product.defaultMargin + '%' : '-'}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            class="inline-input margin-input" 
                                            data-product-id="${product.productId}"
                                            value="${customMargin}"
                                            placeholder="Use default"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            style="width: 120px; text-align: center;"
                                        >
                                    </td>
                                    <td style="text-align: center; font-weight: 600; color: var(--primary-600);">
                                        <span class="effective-margin-display" data-product-id="${product.productId}">
                                            ${effectiveMargin}%
                                        </span>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async loadStoreMargins(storeId) {
        try {
            this.selectedStoreId = storeId;

            // Fetch all products with their margins for this store
            const response = await fetch(`/api/store-product-margins/${storeId}/all-products`);
            if (!response.ok) throw new Error('Failed to load margins');

            this.currentProducts = await response.json();

            // Re-render the margins content
            document.getElementById('marginsContent').innerHTML = this.renderMarginsTable();
            this.attachMarginsEventListeners();

        } catch (error) {
            console.error('Error loading store margins:', error);
            UI.showToast('Error loading margins', 'error');
        }
    },

    attachMarginsEventListeners() {
        // Store selector change
        const storeSelector = document.getElementById('storeSelector');
        if (storeSelector) {
            storeSelector.addEventListener('change', (e) => {
                const storeId = e.target.value;
                if (storeId) {
                    this.loadStoreMargins(storeId);
                } else {
                    this.selectedStoreId = null;
                    document.getElementById('marginsContent').innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: 2rem;">Please select a store to manage product margins</p>';
                }
            });
        }

        // Save margins button
        document.getElementById('saveMarginsBtn')?.addEventListener('click', async () => {
            await this.saveStoreMargins();
        });

        // Bulk margin quick-set buttons
        document.querySelectorAll('.bulk-margin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const margin = parseFloat(e.target.dataset.margin);
                this.applyBulkMargin(margin);
            });
        });

        // Apply custom bulk margin
        document.getElementById('applyBulkMarginBtn')?.addEventListener('click', () => {
            const input = document.getElementById('bulkMarginInput');
            const margin = parseFloat(input.value);
            if (isNaN(margin) || margin < 0 || margin > 100) {
                UI.showToast('Please enter a valid margin between 0 and 100', 'error');
                return;
            }
            this.applyBulkMargin(margin);
            input.value = '';
        });

        // Clear all margins
        document.getElementById('clearAllMarginsBtn')?.addEventListener('click', () => {
            this.applyBulkMargin(null); // null clears all
        });

        // Update effective margin display on input change
        document.querySelectorAll('.margin-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const productId = e.target.dataset.productId;
                const customValue = parseFloat(e.target.value);
                const product = this.currentProducts.find(p => p.productId == productId);

                if (product) {
                    const effectiveMargin = isNaN(customValue) || e.target.value === '' ?
                        (product.defaultMargin || 0) : customValue;

                    const display = document.querySelector(`.effective-margin-display[data-product-id="${productId}"]`);
                    if (display) {
                        display.textContent = effectiveMargin.toFixed(2) + '%';
                    }
                }
            });
        });
    },

    // Apply bulk margin to all products
    applyBulkMargin(margin) {
        const inputs = document.querySelectorAll('.margin-input');
        inputs.forEach(input => {
            if (margin === null) {
                // Clear all
                input.value = '';
            } else {
                input.value = margin;
            }

            // Update effective margin display
            const productId = input.dataset.productId;
            const product = this.currentProducts.find(p => p.productId == productId);
            const display = document.querySelector(`.effective-margin-display[data-product-id="${productId}"]`);

            if (display) {
                const effectiveMargin = margin === null ? (product?.defaultMargin || 0) : margin;
                display.textContent = effectiveMargin.toFixed(2) + '%';
            }
        });

        if (margin === null) {
            UI.showToast('All margins cleared', 'info');
        } else {
            UI.showToast(`${margin}% margin applied to all ${inputs.length} products`, 'success');
        }
    },

    async saveStoreMargins() {
        if (!this.selectedStoreId) {
            UI.showToast('Please select a store first', 'error');
            return;
        }

        const margins = [];
        const inputs = document.querySelectorAll('.margin-input');

        inputs.forEach(input => {
            const productId = parseInt(input.dataset.productId);
            const marginValue = input.value.trim();

            // Only include products with custom margins set
            if (marginValue !== '') {
                margins.push({
                    productId: productId,
                    margin: parseFloat(marginValue)
                });
            }
        });

        if (margins.length === 0) {
            UI.showToast('No margins to save. Enter at least one custom margin.', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/store-product-margins/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: this.selectedStoreId,
                    margins: margins
                })
            });

            if (!response.ok) throw new Error('Failed to save margins');

            const result = await response.json();
            UI.showToast(result.message || 'Margins saved successfully', 'success');

            // Reload the margins to get updated data
            await this.loadStoreMargins(this.selectedStoreId);

        } catch (error) {
            console.error('Error saving margins:', error);
            UI.showToast('Error saving margins', 'error');
        }
    }
};
