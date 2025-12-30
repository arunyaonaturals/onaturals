// ================================
// Dashboard Module - Sales Analytics Dashboard
// ================================

const Dashboard = {
    selectedPeriod: 'month',

    async render() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 60px 20px;">
                <div style="width: 48px; height: 48px; border: 4px solid #e0e0e0; border-top-color: #1f77b4; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const [storesRes, productsRes, billingRes, salesOrdersRes] = await Promise.all([
                fetch('/api/stores'),
                fetch('/api/products'),
                fetch('/api/billing'),
                fetch('/api/sales-orders')
            ]);

            const stores = await storesRes.json();
            const products = await productsRes.json();
            const billing = await billingRes.json();
            const salesOrders = await salesOrdersRes.json();

            const analytics = this.calculateAnalytics(salesOrders, billing);
            const user = Auth.getCurrentUser();

            contentArea.innerHTML = `
                <!-- Tableau-style Dashboard -->
                <div style="background: #f5f5f5; min-height: 100%; padding: 0;">
                    
                    <!-- Header Bar -->
                    <div style="background: #2c3e50; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1f77b4;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">📊</span>
                            <div>
                                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Sales Analytics Dashboard</h1>
                                <p style="margin: 2px 0 0 0; font-size: 11px; opacity: 0.7;">Welcome back, ${user?.fullname || 'User'}</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="dashboard-filter-btn ${this.selectedPeriod === 'today' ? 'active' : ''}" data-period="today">Today</button>
                            <button class="dashboard-filter-btn ${this.selectedPeriod === 'week' ? 'active' : ''}" data-period="week">Week</button>
                            <button class="dashboard-filter-btn ${this.selectedPeriod === 'month' ? 'active' : ''}" data-period="month">Month</button>
                            <button class="dashboard-filter-btn ${this.selectedPeriod === 'year' ? 'active' : ''}" data-period="year">Year</button>
                        </div>
                    </div>

                    <!-- KPI Cards Row -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #ddd;">
                        ${this.renderKPI('Period Sales', Utils.formatCurrency(analytics.periodSales), analytics.periodOrderCount + ' invoices', '#1f77b4', '📈')}
                        ${this.renderKPI('Total Revenue', Utils.formatCurrency(analytics.totalRevenue), salesOrders.length + ' total invoices', '#2ca02c', '💰')}
                        ${this.renderKPI('Avg Order Value', Utils.formatCurrency(analytics.avgOrderValue), 'Per invoice', '#ff7f0e', '📦')}
                        ${this.renderKPI('Active Stores', stores.length.toString(), products.length + ' products', '#9467bd', '🏪')}
                    </div>

                    <!-- Main Content Grid -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0;">
                        
                        <!-- Left Panel - Charts -->
                        <div style="border-right: 1px solid #ddd;">
                            
                            <!-- Monthly Trend Chart -->
                            <div style="background: white; border-bottom: 1px solid #ddd;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">📅 Monthly Sales Trend (${new Date().getFullYear()})</span>
                                </div>
                                <div style="padding: 16px;">
                                    ${this.renderBarChart(analytics.monthlyData)}
                                </div>
                            </div>

                            <!-- Recent Invoices Table -->
                            <div style="background: white;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">🧾 Recent Transactions</span>
                                    <a href="#sales" style="font-size: 11px; color: #1f77b4; text-decoration: none;">View All →</a>
                                </div>
                                <div style="max-height: 300px; overflow-y: auto;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                        <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #1f77b4;">Invoice</th>
                                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #1f77b4;">Date</th>
                                                <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #1f77b4;">Store</th>
                                                <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #555; border-bottom: 2px solid #1f77b4;">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${salesOrders.slice(-8).reverse().map((order, idx) => `
                                                <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                                                    <td style="padding: 8px 12px; color: #1f77b4; font-weight: 500;">${order.invoiceNo}</td>
                                                    <td style="padding: 8px 12px; color: #666;">${order.orderDate || '-'}</td>
                                                    <td style="padding: 8px 12px; color: #333;">${order.storeName || '-'}</td>
                                                    <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #2ca02c;">${Utils.formatCurrency(order.grandTotal)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Right Panel - Rankings & Details -->
                        <div>
                            <!-- Top Stores Ranking -->
                            <div style="background: white; border-bottom: 1px solid #ddd;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">🏆 Top Stores by Revenue</span>
                                </div>
                                <div style="max-height: 250px; overflow-y: auto;">
                                    ${this.renderTopStores(analytics.topStores)}
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div style="background: white; border-bottom: 1px solid #ddd;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">⚡ Quick Actions</span>
                                </div>
                                <div style="padding: 12px 16px;">
                                    <a href="#billing" style="display: block; background: #1f77b4; color: white; text-decoration: none; padding: 10px 16px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; text-align: center;">🧾 Create New Invoice</a>
                                    <a href="#inventory" style="display: block; background: #9467bd; color: white; text-decoration: none; padding: 10px 16px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; text-align: center;">📦 View Inventory</a>
                                    <a href="#despatch" style="display: block; background: #ff7f0e; color: white; text-decoration: none; padding: 10px 16px; border-radius: 4px; font-size: 12px; text-align: center;">🚚 Despatch Orders</a>
                                </div>
                            </div>

                            <!-- Monthly Breakdown -->
                            <div style="background: white;">
                                <div style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 13px; font-weight: 600; color: #333;">📊 Monthly Summary</span>
                                </div>
                                <div style="padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span style="font-size: 12px; color: #666;">Total Orders</span>
                                        <span style="font-size: 12px; font-weight: 600; color: #333;">${analytics.yearlyOrderCount}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span style="font-size: 12px; color: #666;">Total Revenue</span>
                                        <span style="font-size: 12px; font-weight: 600; color: #2ca02c;">${Utils.formatCurrency(analytics.yearlyTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .dashboard-filter-btn {
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.3);
                        color: rgba(255,255,255,0.7);
                        padding: 5px 12px;
                        font-size: 11px;
                        border-radius: 3px;
                        cursor: pointer;
                        transition: all 0.15s;
                    }
                    .dashboard-filter-btn:hover {
                        background: rgba(255,255,255,0.1);
                        color: white;
                    }
                    .dashboard-filter-btn.active {
                        background: #1f77b4;
                        border-color: #1f77b4;
                        color: white;
                    }
                </style>
            `;

            this.attachEventListeners();

        } catch (error) {
            console.error('Dashboard render error:', error);
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="color: #d13438;">Error loading dashboard: ${error.message}</p>
                </div>
            `;
        }
    },

    attachEventListeners() {
        document.querySelectorAll('.dashboard-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectedPeriod = e.target.dataset.period;
                this.render();
            });
        });
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

    renderBarChart(monthlyData) {
        if (monthlyData.length === 0) return '<p style="color: #666; font-size: 12px;">No data available</p>';

        const maxTotal = Math.max(...monthlyData.map(m => m.total)) || 1;

        return `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${monthlyData.map(m => {
            const width = (m.total / maxTotal * 100).toFixed(0);
            return `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 35px; font-size: 11px; font-weight: 500; color: #333;">${m.month}</div>
                            <div style="flex: 1; background: #e8e8e8; border-radius: 2px; height: 18px; overflow: hidden;">
                                <div style="background: linear-gradient(90deg, #1f77b4, #4a9fd4); width: ${width}%; height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px;">
                                    ${m.total > 0 ? `<span style="font-size: 9px; color: white; font-weight: 600;">${Utils.formatCurrency(m.total)}</span>` : ''}
                                </div>
                            </div>
                            <div style="width: 30px; font-size: 10px; color: #666; text-align: right;">${m.count}</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    renderTopStores(topStores) {
        if (topStores.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">No store data for this period</div>';
        }

        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

        return `
            <div style="padding: 0;">
                ${topStores.map((store, idx) => `
                    <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 20px; height: 20px; background: ${colors[idx]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 600;">${idx + 1}</div>
                            <span style="font-size: 12px; color: #333;">${store.name}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; font-weight: 600; color: ${colors[idx]};">${Utils.formatCurrency(store.total)}</div>
                            <div style="font-size: 10px; color: #888;">${store.count} orders</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Modern Bar Chart with gradient bars
    renderModernBarChart(monthlyData) {
        if (monthlyData.length === 0) return '<p style="color: #64748b; font-size: 13px; text-align: center; padding: 24px;">No data available</p>';

        const maxTotal = Math.max(...monthlyData.map(m => m.total)) || 1;

        return `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${monthlyData.map(m => {
            const width = Math.max((m.total / maxTotal * 100), 2).toFixed(0);
            return `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; font-size: 13px; font-weight: 500; color: #64748b;">${m.month}</div>
                            <div style="flex: 1; background: #f1f5f9; border-radius: 8px; height: 28px; overflow: hidden;">
                                <div style="background: linear-gradient(90deg, #6366f1, #8b5cf6); width: ${width}%; height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; transition: width 0.4s ease; border-radius: 8px;">
                                    ${m.total > 0 ? `<span style="font-size: 11px; color: white; font-weight: 600;">${Utils.formatCurrency(m.total)}</span>` : ''}
                                </div>
                            </div>
                            <div style="width: 35px; font-size: 12px; color: #94a3b8; text-align: right;">${m.count}</div>
                        </div>
                    `;
        }).join('')}
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 12px; font-size: 11px; color: #94a3b8; gap: 16px;">
                <span style="display: flex; align-items: center; gap: 4px;">
                    <span style="width: 12px; height: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 3px;"></span>
                    Sales Amount
                </span>
                <span># Invoice Count</span>
            </div>
        `;
    },

    // Modern Ranking with progress bars
    renderModernRanking(topStores) {
        if (topStores.length === 0) {
            return '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">No store data for this period</div>';
        }

        const maxTotal = topStores[0]?.total || 1;
        const colors = [
            'linear-gradient(135deg, #6366f1, #8b5cf6)',
            'linear-gradient(135deg, #10b981, #14b8a6)',
            'linear-gradient(135deg, #f59e0b, #fbbf24)',
            'linear-gradient(135deg, #ec4899, #f472b6)',
            'linear-gradient(135deg, #3b82f6, #60a5fa)'
        ];

        return `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${topStores.map((store, idx) => {
            const width = (store.total / maxTotal * 100).toFixed(0);
            return `
                        <div style="padding: 12px; background: #f8fafc; border-radius: 12px; transition: all 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 24px; height: 24px; background: ${colors[idx]}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700;">${idx + 1}</div>
                                    <span style="font-size: 14px; font-weight: 500; color: #1e293b;">${store.name}</span>
                                </div>
                                <span style="font-size: 14px; font-weight: 600; color: #10b981;">${Utils.formatCurrency(store.total)}</span>
                            </div>
                            <div style="background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden;">
                                <div style="background: ${colors[idx]}; width: ${width}%; height: 100%; border-radius: 4px;"></div>
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${store.count} orders</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Modern Weekly Performance Bars
    renderModernWeeklyBars(weeklyData) {
        if (weeklyData.length === 0) return '<p style="color: #64748b; font-size: 13px; text-align: center;">No data available</p>';

        const maxTotal = Math.max(...weeklyData.map(w => w.total)) || 1;
        const colors = [
            'linear-gradient(135deg, #6366f1, #8b5cf6)',
            'linear-gradient(135deg, #10b981, #14b8a6)',
            'linear-gradient(135deg, #f59e0b, #fbbf24)',
            'linear-gradient(135deg, #ec4899, #f472b6)'
        ];

        return `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${weeklyData.reverse().map((w, idx) => {
            const width = Math.max((w.total / maxTotal * 100), 5).toFixed(0);
            return `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 100px; font-size: 12px; font-weight: 500; color: #64748b;">${w.label}</div>
                            <div style="flex: 1; background: #f1f5f9; border-radius: 6px; height: 24px; overflow: hidden;">
                                <div style="background: ${colors[idx]}; width: ${width}%; height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 12px;">
                                    ${w.total > 0 ? `<span style="font-size: 11px; color: white; font-weight: 600;">${Utils.formatCurrency(w.total)}</span>` : ''}
                                </div>
                            </div>
                            <div style="width: 50px; font-size: 11px; color: #94a3b8; text-align: right;">${w.count} inv</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    // Keep old Tableau functions for backward compatibility
    renderTableauBarChart(monthlyData) {
        return this.renderModernBarChart(monthlyData);
    },

    // Tableau-style Weekly Bars (vertical)
    renderTableauWeeklyBars(weeklyData) {
        if (weeklyData.length === 0) return '<p style="color: #666; font-size: 12px;">No data available</p>';

        const maxTotal = Math.max(...weeklyData.map(w => w.total)) || 1;
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];

        return `
            <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 120px; padding-bottom: 30px; position: relative; border-bottom: 1px solid #ddd;">
                ${weeklyData.reverse().map((w, idx) => {
            const height = Math.max((w.total / maxTotal * 100), 5);
            return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <div style="font-size: 10px; color: #333; font-weight: 600; margin-bottom: 4px;">${Utils.formatCurrency(w.total)}</div>
                            <div style="width: 40px; height: ${height}px; background: ${colors[idx]}; border-radius: 2px 2px 0 0; transition: height 0.3s;"></div>
                            <div style="position: absolute; bottom: 8px; font-size: 10px; color: #666; text-align: center;">${w.label}</div>
                        </div>
                    `;
        }).join('')}
            </div>
            <div style="display: flex; justify-content: space-around; margin-top: 8px;">
                ${weeklyData.map((w, idx) => `
                    <div style="font-size: 10px; color: #888; text-align: center;">${w.count} inv</div>
                `).join('')}
            </div>
        `;
    },

    // Tableau-style Ranking List
    renderTableauRanking(topStores) {
        if (topStores.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">No store data for this period</div>';
        }

        const maxTotal = topStores[0]?.total || 1;
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

        return `
            <div style="padding: 0;">
                ${topStores.map((store, idx) => {
            const width = (store.total / maxTotal * 100).toFixed(0);
            return `
                        <div style="padding: 10px 16px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                            <div style="width: 20px; height: 20px; background: ${colors[idx]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 600;">${idx + 1}</div>
                            <div style="flex: 1;">
                                <div style="font-size: 12px; font-weight: 500; color: #333; margin-bottom: 4px;">${store.name}</div>
                                <div style="background: #e8e8e8; border-radius: 2px; height: 6px; overflow: hidden;">
                                    <div style="background: ${colors[idx]}; width: ${width}%; height: 100%;"></div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 12px; font-weight: 600; color: ${colors[idx]};">${Utils.formatCurrency(store.total)}</div>
                                <div style="font-size: 10px; color: #888;">${store.count} orders</div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    changePeriod(period) {
        this.selectedPeriod = period;
        this.render();
    },

    getPeriodLabel() {
        const labels = { today: "Today's", week: "This Week's", month: "This Month's", year: "This Year's" };
        return labels[this.selectedPeriod] || "This Month's";
    },

    calculateAnalytics(salesOrders, billing) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentWeek = this.getWeekNumber(now);

        // Filter by period
        const periodOrders = salesOrders.filter(order => {
            if (!order.orderDate) return false;
            const orderDate = new Date(order.orderDate);

            switch (this.selectedPeriod) {
                case 'today':
                    return orderDate.toDateString() === now.toDateString();
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    return orderDate >= weekStart;
                case 'month':
                    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
                case 'year':
                    return orderDate.getFullYear() === currentYear;
                default:
                    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
            }
        });

        const periodSales = periodOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);
        const totalRevenue = salesOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);
        const avgOrderValue = salesOrders.length > 0 ? totalRevenue / salesOrders.length : 0;

        // Monthly breakdown for current year
        const monthlyData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let m = 0; m <= currentMonth; m++) {
            const monthOrders = salesOrders.filter(order => {
                if (!order.orderDate) return false;
                const d = new Date(order.orderDate);
                return d.getMonth() === m && d.getFullYear() === currentYear;
            });
            const total = monthOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);
            monthlyData.push({
                month: monthNames[m],
                count: monthOrders.length,
                total: total,
                avg: monthOrders.length > 0 ? total / monthOrders.length : 0
            });
        }

        // Yearly totals
        const yearlyOrders = salesOrders.filter(order => {
            if (!order.orderDate) return false;
            return new Date(order.orderDate).getFullYear() === currentYear;
        });
        const yearlyTotal = yearlyOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);

        // Weekly data (last 4 weeks)
        const weeklyData = [];
        for (let w = 3; w >= 0; w--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() - (w * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const weekOrders = salesOrders.filter(order => {
                if (!order.orderDate) return false;
                const d = new Date(order.orderDate);
                return d >= weekStart && d <= weekEnd;
            });
            const total = weekOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || 0), 0);
            weeklyData.push({
                label: w === 0 ? 'This Week' : w === 1 ? 'Last Week' : `${w} Weeks Ago`,
                count: weekOrders.length,
                total: total
            });
        }

        // Top stores by sales in selected period
        const storeMap = new Map();
        periodOrders.forEach(order => {
            const storeName = order.storeName || 'Unknown';
            const current = storeMap.get(storeName) || { name: storeName, total: 0, count: 0 };
            current.total += parseFloat(order.grandTotal || 0);
            current.count++;
            storeMap.set(storeName, current);
        });
        const topStores = Array.from(storeMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            periodSales,
            periodOrderCount: periodOrders.length,
            totalRevenue,
            avgOrderValue,
            monthlyData,
            weeklyData,
            topStores,
            yearlyTotal,
            yearlyOrderCount: yearlyOrders.length
        };
    },

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    renderMonthlyBreakdown(monthlyData) {
        if (monthlyData.length === 0) {
            return '<tr><td colspan="5" style="text-align: center; color: #64748b;">No data available</td></tr>';
        }

        let prevTotal = 0;
        return monthlyData.map((m, idx) => {
            const trend = idx === 0 ? '—' : (m.total > prevTotal ? '📈 ↑' : (m.total < prevTotal ? '📉 ↓' : '➡️'));
            prevTotal = m.total;
            return `
                <tr>
                    <td><strong>${m.month}</strong></td>
                    <td style="text-align: right;">${m.count}</td>
                    <td style="text-align: right; font-weight: 600; color: #10b981;">${Utils.formatCurrency(m.total)}</td>
                    <td style="text-align: right;">${Utils.formatCurrency(m.avg)}</td>
                    <td>${trend}</td>
                </tr>
            `;
        }).join('');
    },

    renderWeeklyPerformance(weeklyData) {
        if (weeklyData.length === 0) {
            return '<div class="empty-state"><p>No weekly data</p></div>';
        }

        const maxTotal = Math.max(...weeklyData.map(w => w.total)) || 1;

        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${weeklyData.reverse().map(w => `
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="font-weight: 500;">${w.label}</span>
                            <span style="font-weight: 600; color: #10b981;">${Utils.formatCurrency(w.total)}</span>
                        </div>
                        <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${(w.total / maxTotal * 100).toFixed(0)}%; border-radius: 4px;"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">${w.count} invoices</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderTopStores(topStores) {
        if (topStores.length === 0) {
            return '<div class="empty-state"><p>No store data for this period</p></div>';
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${topStores.map((store, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${idx === 0 ? '#10b981' : '#e2e8f0'};">
                        <div>
                            <div style="font-weight: 600; color: #0f172a;">${idx + 1}. ${store.name}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">${store.count} orders</div>
                        </div>
                        <div style="font-weight: 700; color: #10b981;">${Utils.formatCurrency(store.total)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};
