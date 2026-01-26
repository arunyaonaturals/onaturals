// ================================
// Payroll Module - Staff Salary Management
// ================================

const Payroll = {
    payrollData: [],
    staffList: [],
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #48bb78; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            // Fetch staff and payroll data
            const [staffRes, payrollRes] = await Promise.all([
                fetch('/api/staff'),
                fetch(`/api/payroll?month=${this.currentMonth}&year=${this.currentYear}`)
            ]);

            this.staffList = await staffRes.json();
            this.payrollData = await payrollRes.json();

            // Get summary
            const summaryRes = await fetch(`/api/payroll/summary/${this.currentMonth}/${this.currentYear}`);
            const summary = await summaryRes.json();

            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

            contentArea.innerHTML = `
                <!-- Tableau-style Payroll Management -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #48bb78;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">💳</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Payroll Management</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Process and manage staff salaries</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select id="monthSelect" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 11px; padding: 4px 8px; border-radius: 3px;">
                                ${monthNames.slice(1).map((m, i) => `<option value="${i + 1}" ${i + 1 === this.currentMonth ? 'selected' : ''} style="color: black;">${m}</option>`).join('')}
                            </select>
                            <select id="yearSelect" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 11px; padding: 4px 8px; border-radius: 3px;">
                                ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === this.currentYear ? 'selected' : ''} style="color: black;">${y}</option>`).join('')}
                            </select>
                            <button class="pay-gen-btn" id="generatePayrollBtn" style="background: #48bb78; border: 1px solid #48bb78; color: white; padding: 6px 12px; font-size: 11px; border-radius: 3px; cursor: pointer;">⚙️ Generate</button>
                        </div>
                    </div>

                    <!-- KPI Summary -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Total Staff', (summary.totalStaff || 0).toString(), 'On payroll', '#3182ce', '👥')}
                        ${this.renderKPI('Total Gross', Utils.formatCurrency(summary.totalGross || 0), 'Earnings before tax', '#2ca02c', '💰')}
                        ${this.renderKPI('Deductions', Utils.formatCurrency(summary.totalDeductions || 0), 'PF, ESI, etc.', '#d62728', '📉')}
                        ${this.renderKPI('Net Payable', Utils.formatCurrency(summary.totalNet || 0), 'Awaiting disbursement', '#ff7f0e', '✅')}
                    </div>

                    <!-- Main Content -->
                    <div style="background: white; min-height: 400px; padding: 0;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 13px; font-weight: 600; color: #333;">📋 Payroll for ${monthNames[this.currentMonth]} ${this.currentYear}</span>
                            <div style="display: flex; gap: 12px;">
                                <span style="font-size: 11px; color: #48bb78; font-weight: 600;">✅ Paid: ${summary.paidCount || 0}</span>
                                <span style="font-size: 11px; color: #f59e0b; font-weight: 600;">⏳ Pending: ${summary.pendingCount || 0}</span>
                            </div>
                        </div>

                        ${this.payrollData.length > 0 ? this.renderPayrollTable() : `
                            <div style="padding: 60px; text-align: center; color: #666;">
                                <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
                                <p style="font-size: 13px; margin: 0;">No payroll generated for this month</p>
                                <p style="font-size: 11px; color: #888; margin-top: 4px;">Click "Generate" to process staff salaries</p>
                            </div>
                        `}
                    </div>

                    <!-- Salary Components Section -->
                    <div style="background: #f9fafb; padding: 20px; border-top: 1px solid #ddd;">
                        <div style="margin-bottom: 12px;">
                            <h2 style="font-size: 14px; font-weight: 600; color: #333; margin: 0;">💼 Staff Salary Components</h2>
                            <p style="font-size: 11px; color: #666; margin: 2px 0 0 0;">Define basic, HRA, and deductions for each employee</p>
                        </div>
                        <div style="background: white; border: 1px solid #eee; border-radius: 4px; overflow: hidden;">
                            ${this.staffList.filter(s => s.status === 'Active').length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                    <thead style="background: #f8f9fa;">
                                        <tr>
                                            <th style="padding: 8px 12px; text-align: left; color: #555;">Staff</th>
                                            <th style="padding: 8px 12px; text-align: right; color: #555;">Basic</th>
                                            <th style="padding: 8px 12px; text-align: right; color: #555;">HRA</th>
                                            <th style="padding: 8px 12px; text-align: right; color: #555;">Conv</th>
                                            <th style="padding: 8px 12px; text-align: right; color: #555;">PF</th>
                                            <th style="padding: 8px 12px; text-align: right; color: #555;">ESI</th>
                                            <th style="padding: 8px 12px; text-align: center; color: #555;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="salaryComponentsBody">
                                        ${this.staffList.filter(s => s.status === 'Active').map(s => `
                                            <tr style="border-top: 1px solid #eee;">
                                                <td style="padding: 8px 12px;">
                                                    <div style="font-weight: 600;">${s.name}</div>
                                                    <div style="font-size: 9px; color: #888;">${s.designation || '-'}</div>
                                                </td>
                                                <td style="padding: 8px 12px; text-align: right;"><input type="number" id="basic-${s.id}" value="${s.salary || 0}" style="width: 70px; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; text-align: right;"></td>
                                                <td style="padding: 8px 12px; text-align: right;"><input type="number" id="hra-${s.id}" value="0" style="width: 60px; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; text-align: right;"></td>
                                                <td style="padding: 8px 12px; text-align: right;"><input type="number" id="conv-${s.id}" value="0" style="width: 60px; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; text-align: right;"></td>
                                                <td style="padding: 8px 12px; text-align: right;"><input type="number" id="pf-${s.id}" value="0" style="width: 60px; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; text-align: right;"></td>
                                                <td style="padding: 8px 12px; text-align: right;"><input type="number" id="esi-${s.id}" value="0" style="width: 60px; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; text-align: right;"></td>
                                                <td style="padding: 8px 12px; text-align: center;">
                                                    <button onclick="Payroll.saveSalaryComponents(${s.id})" style="background: #3182ce; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">💾</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<div style="padding: 20px; text-align: center; color: #888;">No active staff found</div>'}
                        </div>
                    </div>
                </div>

                <style>
                    .pay-gen-btn:hover { background: #059669 !important; }
                </style>
            `;

            this.attachEventListeners();
            this.loadSalaryComponents();

        } catch (error) {
            console.error('Payroll render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading payroll: ${error.message}</p>
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

    renderPayrollTable() {
        return `
            <div style="max-height: 500px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Staff Name</th>
                            <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Designation</th>
                            <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Days</th>
                            <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Gross</th>
                            <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Deductions</th>
                            <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Net Salary</th>
                            <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Status</th>
                            <th style="padding: 8px 12px; text-align: center; font-weight: 600; color: #555; border-bottom: 2px solid #48bb78;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.payrollData.map((p, idx) => `
                            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                <td style="padding: 8px 12px; font-weight: 600; color: #333;">${p.staffName}</td>
                                <td style="padding: 8px 12px; color: #666;">${p.designation || '-'}</td>
                                <td style="padding: 8px 12px; text-align: center;">${p.presentDays}/${p.workingDays}</td>
                                <td style="padding: 8px 12px; text-align: right;">${Utils.formatCurrency(p.grossSalary)}</td>
                                <td style="padding: 8px 12px; text-align: right; color: #d13438;">${Utils.formatCurrency(p.totalDeductions)}</td>
                                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #107c10;">${Utils.formatCurrency(p.netSalary)}</td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <span style="background: ${p.status === 'paid' ? '#dff6dd' : '#fff4ce'}; 
                                                 color: ${p.status === 'paid' ? '#107c10' : '#997600'}; 
                                                 padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                        ${(p.status || 'pending').toUpperCase()}
                                    </span>
                                </td>
                                <td style="padding: 8px 12px; text-align: center;">
                                    <div style="display: flex; gap: 4px; justify-content: center;">
                                        ${p.status !== 'paid' ? `
                                            <button onclick="Payroll.markAsPaid(${p.id})" style="background: #107c10; border: 1px solid #107c10; color: white; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">💵 Pay</button>
                                        ` : ''}
                                        <button onclick="Payroll.printPayslip(${p.id})" style="background: #f3f2f1; border: 1px solid #ddd; padding: 3px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">🖨️ Ps</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async loadSalaryComponents() {
        for (const staff of this.staffList.filter(s => s.status === 'Active')) {
            try {
                const res = await fetch(`/api/payroll/salary-components/${staff.id}`);
                const comp = await res.json();

                if (comp.basicSalary) document.getElementById(`basic-${staff.id}`).value = comp.basicSalary;
                if (comp.hra) document.getElementById(`hra-${staff.id}`).value = comp.hra;
                if (comp.conveyance) document.getElementById(`conv-${staff.id}`).value = comp.conveyance;
                if (comp.pf) document.getElementById(`pf-${staff.id}`).value = comp.pf;
                if (comp.esi) document.getElementById(`esi-${staff.id}`).value = comp.esi;
            } catch (e) {
                // Ignore
            }
        }
    },

    attachEventListeners() {
        document.getElementById('monthSelect')?.addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('yearSelect')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('generatePayrollBtn')?.addEventListener('click', async () => {
            if (!confirm(`Generate payroll for ${this.currentMonth}/${this.currentYear}?`)) return;

            try {
                const res = await fetch('/api/payroll/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: this.currentMonth, year: this.currentYear, workingDays: 26 })
                });
                const result = await res.json();
                if (result.success) {
                    UI.showToast('✅ Payroll generated!', 'success');
                    this.render();
                } else {
                    UI.showToast(`❌ ${result.error}`, 'error');
                }
            } catch (error) {
                UI.showToast('Error generating payroll', 'error');
            }
        });
    },

    async markAsPaid(id) {
        if (!confirm('Mark this salary as paid?')) return;
        try {
            const res = await fetch(`/api/payroll/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'paid',
                    paidDate: new Date().toISOString().split('T')[0],
                    paymentMode: 'Bank Transfer'
                })
            });
            if (res.ok) {
                UI.showToast('✅ Marked as paid', 'success');
                this.render();
            }
        } catch (error) {
            UI.showToast('Error updating status', 'error');
        }
    },

    async saveSalaryComponents(staffId) {
        const data = {
            basicSalary: parseFloat(document.getElementById(`basic-${staffId}`).value) || 0,
            hra: parseFloat(document.getElementById(`hra-${staffId}`).value) || 0,
            conveyance: parseFloat(document.getElementById(`conv-${staffId}`).value) || 0,
            pf: parseFloat(document.getElementById(`pf-${staffId}`).value) || 0,
            esi: parseFloat(document.getElementById(`esi-${staffId}`).value) || 0
        };

        try {
            const res = await fetch(`/api/payroll/salary-components/${staffId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                UI.showToast('✅ Components saved', 'success');
            }
        } catch (error) {
            UI.showToast('Error saving', 'error');
        }
    },

    async printPayslip(id) {
        try {
            const [payrollRes, settingsRes] = await Promise.all([
                fetch(`/api/payroll/${id}`),
                fetch('/api/settings')
            ]);
            const payroll = await payrollRes.json();
            const settings = await settingsRes.json();

            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Payslip - ${payroll.staffName}</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; line-height: 1.6; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 15px; margin-bottom: 20px; }
                        .header h1 { margin: 0; font-size: 20px; color: #2c3e50; }
                        .header p { margin: 3px 0; font-size: 11px; color: #666; }
                        .payslip-title { text-align: center; background: #f8f9fa; padding: 8px; font-weight: 700; margin: 20px 0; border: 1px solid #ddd; }
                        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                        .info-table td { padding: 6px 10px; border: 1px solid #eee; }
                        .label { color: #666; width: 150px; }
                        .value { font-weight: 600; }
                        .salary-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                        .salary-table th, .salary-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                        .salary-table th { background: #2c3e50; color: white; }
                        .salary-table .subheading { background: #f8f9fa; font-weight: 700; }
                        .amount { text-align: right; }
                        .net-payable { background: #dff6dd; font-size: 16px; font-weight: 700; text-align: center; padding: 15px; margin-top: 20px; border: 2px solid #107c10; }
                        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${settings.companyName || 'ARUNYA CONSUMABLES PRIVATE LIMITED'}</h1>
                        <p>${settings.address || 'Chennai'}</p>
                    </div>

                    <div class="payslip-title">PAYSLIP FOR ${monthNames[payroll.month].toUpperCase()} ${payroll.year}</div>

                    <table class="info-table">
                        <tr>
                            <td class="label">Employee Name</td><td class="value">${payroll.staffName}</td>
                            <td class="label">Designation</td><td class="value">${payroll.designation || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label">Days Worked</td><td class="value">${payroll.presentDays} / ${payroll.workingDays}</td>
                            <td class="label">Paid Date</td><td class="value">${payroll.paidDate || 'Pending'}</td>
                        </tr>
                    </table>

                    <table class="salary-table">
                        <thead>
                            <tr>
                                <th colspan="2">EARNINGS</th>
                                <th colspan="2">DEDUCTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Basic Salary</td><td class="amount">₹${(payroll.basicSalary || 0).toFixed(2)}</td>
                                <td>Provident Fund</td><td class="amount">₹${(payroll.pf || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>HRA</td><td class="amount">₹${(payroll.hra || 0).toFixed(2)}</td>
                                <td>ESI</td><td class="amount">₹${(payroll.esi || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Conveyance</td><td class="amount">₹${(payroll.conveyance || 0).toFixed(2)}</td>
                                <td>Prof. Tax</td><td class="amount">₹${(payroll.professionalTax || 0).toFixed(2)}</td>
                            </tr>
                            <tr class="subheading">
                                <td>Total Earnings</td><td class="amount">₹${(payroll.grossSalary || 0).toFixed(2)}</td>
                                <td>Total Deductions</td><td class="amount">₹${(payroll.totalDeductions || 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="net-payable">
                        NET PAYABLE: ₹${(payroll.netSalary || 0).toFixed(2)}
                    </div>

                    <div class="footer">
                        <p>This is a computer-generated document and does not require a physical signature.</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
        } catch (error) {
            UI.showToast('Error generating payslip', 'error');
        }
    }
};

window.Payroll = Payroll;
