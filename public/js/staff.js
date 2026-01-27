// ================================
// Staff Module - With Attendance Reports
// ================================

const Staff = {
    currentStaff: [],
    viewMode: 'list', // 'list', 'attendance', 'reports', or 'form'
    editingStaff: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    attendanceSummary: [],

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/staff');
            this.currentStaff = await response.json();

            // Calculate stats
            const totalStaff = this.currentStaff.length;
            const activeStaff = this.currentStaff.filter(s => s.status === 'Active' || !s.status).length;
            const departments = [...new Set(this.currentStaff.map(s => s.designation).filter(Boolean))].length;

            contentArea.innerHTML = `
                <!-- Tableau-style Staff Management -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">👥</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Staff Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Manage employees and track attendance</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="staff-tab-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list">📋 Staff List</button>
                            <button class="staff-tab-btn ${this.viewMode === 'attendance' ? 'active' : ''}" data-view="attendance">📅 Attendance</button>
                            <button class="staff-tab-btn ${this.viewMode === 'reports' ? 'active' : ''}" data-view="reports">📊 Reports</button>
                            <button class="staff-tab-btn ${this.viewMode === 'form' ? 'active' : ''}" data-view="form" style="${this.viewMode === 'form' ? 'background: #2ca02c; border-color: #2ca02c;' : ''}">➕ ${this.editingStaff ? 'Edit' : 'Add'}</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Staff', totalStaff.toString(), 'On payroll', '#059669', '👥')}
                        ${this.renderKPI('Active', activeStaff.toString(), 'Currently working', '#2ca02c', '✅')}
                        ${this.renderKPI('Designations', departments.toString(), 'Roles defined', '#9467bd', '💼')}
                    </div>

                    <!-- Main Content -->
                    <div id="staffContent">
                        ${this.viewMode === 'list' ? this.renderListView() :
                    this.viewMode === 'attendance' ? this.renderAttendanceView() :
                        this.viewMode === 'reports' ? this.renderReportsView() :
                            this.renderFormView()}
                    </div>
                </div>

                <style>
                    .staff-tab-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 6px 14px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .staff-tab-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .staff-tab-btn.active {
                        background: #10b981;
                        border-color: #10b981;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

            if (this.viewMode === 'reports') {
                await this.loadMonthlySummary();
            }

        } catch (error) {
            console.error('Staff render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading staff: ${error.message}</p>
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
                    <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Staff Directory (${this.currentStaff.length})</span>
                    <input type="text" id="searchInput" placeholder="Search staff..." style="padding: 5px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; width: 250px;">
                </div>
                <div style="max-height: 550px; overflow-y: auto;" id="staffTable">
                    ${this.renderTable(this.currentStaff)}
                </div>
            </div>
        `;
    },

    renderTable(staff) {
        if (staff.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: #666;">No staff members found.</div>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">Name</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">Designation</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">Phone</th>
                        <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">DOB</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">Status</th>
                        <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #10b981;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${staff.map((s, idx) => `
                        <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                            <td style="padding: 8px 12px;">
                                <div style="font-weight: 600; color: #059669;">${s.name}</div>
                                ${s.email ? `<div style="font-size: 10px; color: #888;">${s.email}</div>` : ''}
                            </td>
                            <td style="padding: 8px 12px; color: #333;">${s.designation || '-'}</td>
                            <td style="padding: 8px 12px; color: #666;">${s.phoneNumber || '-'}</td>
                            <td style="padding: 8px 12px; color: #666;">${s.dob ? this.formatDate(s.dob) : '-'}</td>
                            <td style="padding: 8px 12px; text-align: center;">
                                <span style="background: ${s.status === 'Inactive' ? '#fde7e9' : '#dff6dd'}; 
                                             color: ${s.status === 'Inactive' ? '#d13438' : '#107c10'}; 
                                             padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                    ${(s.status || 'Active').toUpperCase()}
                                </span>
                            </td>
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

    renderFormView() {
        const s = this.editingStaff;
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">${s ? '✏️ Edit Staff' : '➕ Add New Staff'}</h2>
                    <button class="btn btn-secondary" data-view="list">← Back</button>
                </div>
                <div class="card-body">
                    <form id="staffForm">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" name="name" class="form-input" value="${s?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Designation *</label>
                                <select name="designation" class="form-select" required>
                                    <option value="">Select</option>
                                    <option value="Sales Captain" ${s?.designation === 'Sales Captain' ? 'selected' : ''}>Sales Captain</option>
                                    <option value="Distributor" ${s?.designation === 'Distributor' ? 'selected' : ''}>Distributor</option>
                                    <option value="Manager" ${s?.designation === 'Manager' ? 'selected' : ''}>Manager</option>
                                    <option value="Driver" ${s?.designation === 'Driver' ? 'selected' : ''}>Driver</option>
                                    <option value="Helper" ${s?.designation === 'Helper' ? 'selected' : ''}>Helper</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Phone *</label>
                                <input type="tel" name="phoneNumber" class="form-input" value="${s?.phoneNumber || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Aadhar Number</label>
                                <input type="text" name="aadharNumber" class="form-input" value="${s?.aadharNumber || ''}" maxlength="12">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" name="dob" class="form-input" value="${s?.dob || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-input" value="${s?.email || ''}">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label class="form-label">Address</label>
                                <input type="text" name="address" class="form-input" value="${s?.address || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Joining Date</label>
                                <input type="date" name="joiningDate" class="form-input" value="${s?.joiningDate || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Salary (₹)</label>
                                <input type="number" name="salary" class="form-input" value="${s?.salary || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-select">
                                    <option value="Active" ${s?.status === 'Active' || !s ? 'selected' : ''}>Active</option>
                                    <option value="Inactive" ${s?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
                            <button type="submit" class="btn btn-primary">${s ? '💾 Update' : '➕ Add'}</button>
                            <button type="button" class="btn btn-secondary" data-view="list">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    renderAttendanceView() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📅 Mark Daily Attendance</h2>
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <input type="date" class="form-input" id="attendanceDate" value="${this.selectedDate}" style="width: auto;">
                        <button class="btn btn-primary" id="saveAttendanceBtn">💾 Save</button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="attendanceTable">
                        ${this.renderAttendanceTable()}
                    </div>
                </div>
            </div>
        `;
    },

    renderAttendanceTable() {
        const activeStaff = this.currentStaff.filter(s => s.status === 'Active');
        if (activeStaff.length === 0) {
            return `<div class="empty-state"><div class="empty-state-icon">👥</div><p>No active staff.</p></div>`;
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Designation</th>
                            <th style="width: 140px;">Status</th>
                            <th style="width: 100px;">In</th>
                            <th style="width: 100px;">Out</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeStaff.map(s => `
                            <tr data-staff-id="${s.id}">
                                <td style="font-weight: 600;">${s.name}</td>
                                <td>${s.designation || '-'}</td>
                                <td>
                                    <select class="form-select attendance-status" data-staff-id="${s.id}" style="padding: 0.4rem;">
                                        <option value="Present">✅ Present</option>
                                        <option value="Absent">❌ Absent</option>
                                        <option value="Half Day">⏰ Half Day</option>
                                        <option value="Leave">🏖️ Leave</option>
                                    </select>
                                </td>
                                <td><input type="time" class="form-input check-in" data-staff-id="${s.id}" style="padding: 0.4rem;"></td>
                                <td><input type="time" class="form-input check-out" data-staff-id="${s.id}" style="padding: 0.4rem;"></td>
                                <td><input type="text" class="form-input attendance-remarks" data-staff-id="${s.id}" placeholder="..." style="padding: 0.4rem;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderReportsView() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📊 Monthly Attendance Report</h2>
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <input type="month" class="form-input" id="reportMonth" value="${this.selectedMonth}" style="width: auto;">
                        <button class="btn btn-secondary" id="exportReportBtn">📥 Export</button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="reportSummary">
                        <div class="empty-state"><div class="empty-state-icon">⏳</div><p>Loading report...</p></div>
                    </div>
                </div>
            </div>
        `;
    },

    async loadMonthlySummary() {
        try {
            const response = await fetch(`/api/staff/attendance/summary/${this.selectedMonth}`);
            this.attendanceSummary = await response.json();

            const container = document.getElementById('reportSummary');
            if (!container) return;

            if (this.attendanceSummary.length === 0) {
                container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><p>No attendance data for ${this.getMonthName(this.selectedMonth)}</p></div>`;
                return;
            }

            // Calculate totals
            const totalDaysInMonth = new Date(this.selectedMonth + '-01').getMonth() === new Date().getMonth()
                ? new Date().getDate()
                : new Date(this.selectedMonth.split('-')[0], this.selectedMonth.split('-')[1], 0).getDate();

            container.innerHTML = `
                <!-- Summary Stats -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: linear-gradient(135deg, #48bb78 0%, #059669 100%); padding: 1rem; border-radius: 0.75rem; color: white;">
                        <div style="font-size: 0.75rem; opacity: 0.9;">Total Staff</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${this.attendanceSummary.length}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1rem; border-radius: 0.75rem; color: white;">
                        <div style="font-size: 0.75rem; opacity: 0.9;">Working Days</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${totalDaysInMonth}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 1rem; border-radius: 0.75rem; color: white;">
                        <div style="font-size: 0.75rem; opacity: 0.9;">Avg Attendance</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${this.calculateAvgAttendance()}%</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 1rem; border-radius: 0.75rem; color: white;">
                        <div style="font-size: 0.75rem; opacity: 0.9;">Month</div>
                        <div style="font-size: 1.25rem; font-weight: 700;">${this.getMonthName(this.selectedMonth)}</div>
                    </div>
                </div>

                <!-- Staff-wise Report -->
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Staff Name</th>
                                <th>Designation</th>
                                <th style="text-align: center;">✅ Present</th>
                                <th style="text-align: center;">❌ Absent</th>
                                <th style="text-align: center;">⏰ Half Day</th>
                                <th style="text-align: center;">🏖️ Leave</th>
                                <th style="text-align: center;">Attendance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.attendanceSummary.map(s => {
                const total = (s.presentDays || 0) + (s.absentDays || 0) + (s.halfDays || 0) + (s.leaveDays || 0);
                const effectiveDays = (s.presentDays || 0) + ((s.halfDays || 0) * 0.5);
                const percentage = total > 0 ? Math.round((effectiveDays / total) * 100) : 0;
                const color = percentage >= 90 ? '#48bb78' : percentage >= 75 ? '#f59e0b' : '#ef4444';

                return `
                                    <tr>
                                        <td style="font-weight: 600;">${s.name}</td>
                                        <td>${s.designation || '-'}</td>
                                        <td style="text-align: center;">
                                            <span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">${s.presentDays || 0}</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">${s.absentDays || 0}</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">${s.halfDays || 0}</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-weight: 600;">${s.leaveDays || 0}</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="background: ${color}; color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-weight: 600;">${percentage}%</span>
                                        </td>
                                    </tr>
                                `;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            console.error('Error loading summary:', error);
            document.getElementById('reportSummary').innerHTML = `<div class="empty-state"><p>Error loading report</p></div>`;
        }
    },

    calculateAvgAttendance() {
        if (this.attendanceSummary.length === 0) return 0;
        let totalPercentage = 0;
        this.attendanceSummary.forEach(s => {
            const total = (s.presentDays || 0) + (s.absentDays || 0) + (s.halfDays || 0) + (s.leaveDays || 0);
            const effectiveDays = (s.presentDays || 0) + ((s.halfDays || 0) * 0.5);
            totalPercentage += total > 0 ? (effectiveDays / total) * 100 : 0;
        });
        return Math.round(totalPercentage / this.attendanceSummary.length);
    },

    getMonthName(monthStr) {
        const [year, month] = monthStr.split('-');
        return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    attachEventListeners() {
        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newView = e.target.dataset.view;
                if (newView === 'form' && this.viewMode !== 'form') {
                    this.editingStaff = null;
                }
                this.viewMode = newView;
                this.render();
            });
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filtered = this.currentStaff.filter(member =>
                    member.name?.toLowerCase().includes(searchTerm) ||
                    member.designation?.toLowerCase().includes(searchTerm)
                );
                document.getElementById('staffTable').innerHTML = this.renderTable(filtered);
                this.attachTableActions();
            }, 300));
        }

        // Staff form submit
        document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveStaff();
        });

        // Attendance date change
        document.getElementById('attendanceDate')?.addEventListener('change', async (e) => {
            this.selectedDate = e.target.value;
            await this.loadAttendanceForDate(this.selectedDate);
        });

        // Save attendance
        document.getElementById('saveAttendanceBtn')?.addEventListener('click', () => {
            this.saveAttendance();
        });

        // Report month change
        document.getElementById('reportMonth')?.addEventListener('change', async (e) => {
            this.selectedMonth = e.target.value;
            await this.loadMonthlySummary();
        });

        // Export report
        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            this.exportReport();
        });

        this.attachTableActions();
    },

    attachTableActions() {
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editStaff(id);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                if (confirm('Delete this staff member?')) {
                    await this.deleteStaff(id);
                }
            });
        });
    },

    async saveStaff() {
        const form = document.getElementById('staffForm');
        const formData = new FormData(form);
        const staffData = Object.fromEntries(formData);

        try {
            if (this.editingStaff) {
                await fetch(`/api/staff/${this.editingStaff.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staffData)
                });
                UI.showToast('✅ Staff updated!', 'success');
            } else {
                await fetch('/api/staff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staffData)
                });
                UI.showToast('✅ Staff added!', 'success');
            }

            this.editingStaff = null;
            this.viewMode = 'list';
            this.render();
        } catch (error) {
            console.error('Error saving staff:', error);
            UI.showToast('Error saving staff', 'error');
        }
    },

    editStaff(id) {
        this.editingStaff = this.currentStaff.find(s => s.id === id);
        this.viewMode = 'form';
        this.render();
    },

    async deleteStaff(id) {
        try {
            await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            UI.showToast('✅ Staff deleted!', 'success');
            this.render();
        } catch (error) {
            console.error('Error deleting staff:', error);
            UI.showToast('Error deleting staff', 'error');
        }
    },

    async loadAttendanceForDate(date) {
        try {
            const response = await fetch(`/api/staff/attendance/date/${date}`);
            const attendance = await response.json();

            attendance.forEach(record => {
                const statusSelect = document.querySelector(`.attendance-status[data-staff-id="${record.staffId}"]`);
                const checkInInput = document.querySelector(`.check-in[data-staff-id="${record.staffId}"]`);
                const checkOutInput = document.querySelector(`.check-out[data-staff-id="${record.staffId}"]`);
                const remarksInput = document.querySelector(`.attendance-remarks[data-staff-id="${record.staffId}"]`);

                if (statusSelect) statusSelect.value = record.status;
                if (checkInInput) checkInInput.value = record.checkIn || '';
                if (checkOutInput) checkOutInput.value = record.checkOut || '';
                if (remarksInput) remarksInput.value = record.remarks || '';
            });
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    },

    async saveAttendance() {
        const date = this.selectedDate;
        const attendance = [];

        document.querySelectorAll('.attendance-status').forEach(select => {
            const staffId = parseInt(select.dataset.staffId);
            attendance.push({
                staffId,
                status: select.value,
                checkIn: document.querySelector(`.check-in[data-staff-id="${staffId}"]`)?.value || null,
                checkOut: document.querySelector(`.check-out[data-staff-id="${staffId}"]`)?.value || null,
                remarks: document.querySelector(`.attendance-remarks[data-staff-id="${staffId}"]`)?.value || null
            });
        });

        try {
            await fetch('/api/staff/attendance/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, attendance })
            });
            UI.showToast('✅ Attendance saved!', 'success');
        } catch (error) {
            console.error('Error saving attendance:', error);
            UI.showToast('Error saving attendance', 'error');
        }
    },

    exportReport() {
        if (this.attendanceSummary.length === 0) {
            UI.showToast('No data to export', 'error');
            return;
        }

        // Create CSV content
        let csv = 'Staff Name,Designation,Present,Absent,Half Day,Leave,Attendance %\n';
        this.attendanceSummary.forEach(s => {
            const total = (s.presentDays || 0) + (s.absentDays || 0) + (s.halfDays || 0) + (s.leaveDays || 0);
            const effectiveDays = (s.presentDays || 0) + ((s.halfDays || 0) * 0.5);
            const percentage = total > 0 ? Math.round((effectiveDays / total) * 100) : 0;
            csv += `"${s.name}","${s.designation || ''}",${s.presentDays || 0},${s.absentDays || 0},${s.halfDays || 0},${s.leaveDays || 0},${percentage}%\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${this.selectedMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('✅ Report exported!', 'success');
    }
};
