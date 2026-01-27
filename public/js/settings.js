// ================================
// Settings Module
// ================================

const Settings = {
    currentSettings: {},

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #6b7280; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const response = await fetch('/api/settings');
            this.currentSettings = await response.json();

            contentArea.innerHTML = `
                <!-- Tableau-style Settings -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6b7280;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">⚙️</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">System Settings</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Configure company details and preferences</p>
                            </div>
                        </div>
                        <button type="submit" form="settingsForm" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">💾 Save Changes</button>
                    </div>

                    <div style="padding: 20px; max-width: 1000px; margin: 0 auto;">
                        <form id="settingsForm">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                                
                                <!-- Company Details -->
                                <div style="background: white; border-radius: 4px; border: 1px solid #ddd; overflow: hidden;">
                                    <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa; font-weight: 600; font-size: 13px;">🏢 Company Profile</div>
                                    <div style="padding: 16px; display: grid; gap: 12px;">
                                        <div class="form-group">
                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Company Name *</label>
                                            <input type="text" name="companyName" value="${this.currentSettings.companyName || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;" required>
                                        </div>
                                        <div class="form-group">
                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">GSTIN *</label>
                                            <input type="text" name="gstin" value="${this.currentSettings.gstin || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;" required>
                                        </div>
                                        <div class="form-group">
                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Address *</label>
                                            <textarea name="address" rows="2" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px; resize: none;" required>${this.currentSettings.address || ''}</textarea>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                            <div class="form-group">
                                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Phone</label>
                                                <input type="tel" name="phone" value="${this.currentSettings.phone || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                            </div>
                                            <div class="form-group">
                                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Email</label>
                                                <input type="email" name="email" value="${this.currentSettings.email || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Bank & Logo -->
                                <div style="display: grid; gap: 20px;">
                                    <!-- Bank Details -->
                                    <div style="background: white; border-radius: 4px; border: 1px solid #ddd; overflow: hidden;">
                                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa; font-weight: 600; font-size: 13px;">🏦 Bank Information</div>
                                        <div style="padding: 16px; display: grid; gap: 12px;">
                                            <div class="form-group">
                                                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Bank Name</label>
                                                <input type="text" name="bankName" value="${this.currentSettings.bankName || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                            </div>
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                                <div class="form-group">
                                                    <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Account Number</label>
                                                    <input type="text" name="accountNo" value="${this.currentSettings.accountNo || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                                </div>
                                                <div class="form-group">
                                                    <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">IFSC Code</label>
                                                    <input type="text" name="ifscCode" value="${this.currentSettings.ifscCode || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Logo Upload -->
                                    <div style="background: white; border-radius: 4px; border: 1px solid #ddd; overflow: hidden;">
                                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa; font-weight: 600; font-size: 13px;">🖼️ Company Logo</div>
                                        <div style="padding: 16px; display: flex; gap: 16px; align-items: flex-start;">
                                            <div style="flex: 1;">
                                                <input type="file" id="logoInput" accept="image/*" style="font-size: 11px; width: 100%;">
                                                <p style="margin-top: 6px; font-size: 10px; color: #888;">PNG/JPG, 300x100px recommended (Max 2MB)</p>
                                            </div>
                                            <div id="logoPreview" style="width: 120px; height: 60px; border: 1px dashed #ccc; border-radius: 3px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                                                ${this.currentSettings.logoPath ?
                    `<img src="${this.currentSettings.logoPath}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` :
                    '<span style="color: #ccc; font-size: 10px;">No logo</span>'
                }
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- User Management -->
                                ${Auth.isAdmin() ? `
                                <div style="background: white; border-radius: 4px; border: 1px solid #ddd; overflow: hidden; grid-column: span 2;">
                                    <div style="padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa; display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: 600; font-size: 13px;">👥 User Management</span>
                                        <button type="button" onclick="Settings.showAddUserModal()" style="background: #2ca02c; color: white; border: none; padding: 4px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">➕ Add User</button>
                                    </div>
                                    <div style="padding: 0;" id="userManagementContainer">
                                        <!-- Users list will be rendered here -->
                                    </div>
                                </div>
                                ` : ''}

                                <!-- Master Reset (Admin only) -->
                                ${Auth.isAdmin() ? `
                                <div style="background: #fff5f5; border-radius: 4px; border: 1px solid #feb2b2; overflow: hidden; grid-column: span 2;">
                                    <div style="padding: 12px 16px; border-bottom: 1px solid #feb2b2; background: #fee2e2; font-weight: 600; font-size: 13px; color: #c53030;">⚠️ Danger Zone</div>
                                    <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <div style="font-weight: 600; font-size: 12px; color: #c53030;">Master reset</div>
                                            <div style="font-size: 11px; color: #7f1d1d;">This will delete all sales, inventory, and billing data. Staff and products will remain.</div>
                                        </div>
                                        <button type="button" onclick="Settings.handleMasterReset()" style="background: #c53030; color: white; border: none; padding: 6px 12px; border-radius: 3px; font-size: 11px; font-weight: 600; cursor: pointer;">🔥 Reset Data</button>
                                    </div>
                                </div>
                                ` : ''}

                            </div>
                        </form>
                    </div>
                </div>

                <style>
                    .form-group input:focus, .form-group textarea:focus {
                        outline: none;
                        border-color: #059669 !important;
                        box-shadow: 0 0 0 2px rgba(31,119,180,0.1);
                    }
                </style>
            `;

            this.attachEventListeners();

            if (Auth.isAdmin()) {
                this.renderUsers();
            }

        } catch (error) {
            console.error('Settings render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading settings: ${error.message}</p>
                </div>
            `;
        }
    },

    attachEventListeners() {
        // Logo preview
        document.getElementById('logoInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('logoPreview').innerHTML =
                        `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Form submit
        document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });
    },

    async saveSettings() {
        try {
            const formData = new FormData(document.getElementById('settingsForm'));
            const settingsData = Object.fromEntries(formData);

            // Keep existing logo path
            settingsData.logoPath = this.currentSettings.logoPath;

            // Handle logo upload if new file selected
            const logoInput = document.getElementById('logoInput');
            if (logoInput && logoInput.files.length > 0) {
                const logoFormData = new FormData();
                logoFormData.append('logo', logoInput.files[0]);

                const logoResponse = await fetch('/api/settings/logo', {
                    method: 'POST',
                    body: logoFormData
                });

                if (!logoResponse.ok) throw new Error('Logo upload failed');

                const logoResult = await logoResponse.json();
                settingsData.logoPath = logoResult.logoPath;
            }

            // Save all settings
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData)
            });

            if (!response.ok) throw new Error('Save failed');

            UI.showToast('✅ Settings saved successfully!', 'success');
            this.render();

        } catch (error) {
            console.error('Error saving settings:', error);
            UI.showToast('Error saving settings', 'error');
        }
    },

    async renderUsers() {
        const container = document.getElementById('userManagementContainer');
        if (!container) return;

        try {
            const response = await fetch('/api/auth/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();

            container.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="padding: 10px 16px; text-align: left; color: #555;">Username</th>
                            <th style="padding: 10px 16px; text-align: left; color: #555;">Full Name</th>
                            <th style="padding: 10px 16px; text-align: left; color: #555;">Role</th>
                            <th style="padding: 10px 16px; text-align: center; color: #555;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map((u, idx) => `
                            <tr style="border-top: 1px solid #eee; background: ${idx % 2 === 0 ? '#fff' : '#fafafa'};">
                                <td style="padding: 10px 16px; font-weight: 600;">${u.username}</td>
                                <td style="padding: 10px 16px;">${u.name || '-'}</td>
                                <td style="padding: 10px 16px;">
                                    <span style="padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; background: ${u.role === 'admin' ? '#dbeafe' : '#f3f4f6'}; color: ${u.role === 'admin' ? '#1e40af' : '#374151'};">
                                        ${u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style="padding: 10px 16px; text-align: center;">
                                    <button onclick="Settings.deleteUser(${u.id})" style="background: #fff; border: 1px solid #ddd; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; color: #d13438;">🗑️ Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

        } catch (error) {
            console.error('Error rendering users:', error);
            container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading users</div>`;
        }
    },

    async deleteUser(id) {
        const currentUser = Auth.getCurrentUser();
        if (id == currentUser.id) {
            UI.showToast('You cannot delete yourself!', 'warning');
            return;
        }

        if (confirm('Delete this user?')) {
            const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                UI.showToast('User deleted', 'success');
                this.renderUsers();
            }
        }
    },

    showAddUserModal() {
        const fields = [
            { name: 'username', label: 'Username *', placeholder: 'Enter username', required: true },
            { name: 'password', label: 'Password *', type: 'password', placeholder: 'Enter password', required: true },
            { name: 'name', label: 'Full Name', placeholder: 'Enter display name' },
            {
                name: 'role', label: 'Role', type: 'select', options: [
                    { label: 'Admin', value: 'admin' },
                    { label: 'Restricted', value: 'restricted' }
                ], value: 'restricted', required: true
            }
        ];

        const content = `<form id="addUserForm">${UI.createForm(fields)}</form>`;
        const buttons = [
            { label: 'Cancel', type: 'secondary', action: 'close' },
            { label: 'Create User', type: 'primary', action: 'submit' }
        ];

        const modal = UI.createModal('➕ Create New User', content, buttons);

        modal.querySelector('[data-action="submit"]').addEventListener('click', async () => {
            const form = document.getElementById('addUserForm');
            const formData = new FormData(form);
            const userData = Object.fromEntries(formData);

            if (!userData.username || !userData.password) {
                UI.showToast('Required fields missing', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/auth/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    UI.showToast('✅ User created!', 'success');
                    UI.closeModal();
                    this.renderUsers();
                } else {
                    const data = await response.json();
                    UI.showToast(data.error || 'Error', 'error');
                }
            } catch (error) {
                UI.showToast('Connection error', 'error');
            }
        });
    },

    async handleMasterReset() {
        if (!confirm('🔥 MASTER RESET: This will delete ALL business data.\n\nOnly Staff and Product catalog will be preserved.\n\nARE YOU ABSOLUTELY SURE?')) return;

        const confirmText = prompt('Please type "RESET" to confirm:');
        if (confirmText !== 'RESET') return;

        try {
            const res = await fetch('/api/settings/master-reset', { method: 'POST' });
            if (res.ok) {
                UI.showToast('🚀 Master reset successful!', 'success');
                setTimeout(() => location.reload(), 2000);
            }
        } catch (error) {
            UI.showToast('Reset failed', 'error');
        }
    }
};

window.Settings = Settings;
