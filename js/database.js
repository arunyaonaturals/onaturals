// ================================
// IndexedDB Database Manager
// ================================

const DB = {
    name: 'ArunyaDB',
    version: 1,
    db: null,

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create Stores table
                if (!db.objectStoreNames.contains('stores')) {
                    const storeStore = db.createObjectStore('stores', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    storeStore.createIndex('storeName', 'storeName', { unique: false });
                    storeStore.createIndex('area', 'area', { unique: false });
                    storeStore.createIndex('beat', 'beat', { unique: false });
                }

                // Create Products table
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    productStore.createIndex('productName', 'productName', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('productCode', 'productCode', { unique: true });
                }

                // Create Sales table
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    salesStore.createIndex('storeId', 'storeId', { unique: false });
                    salesStore.createIndex('productId', 'productId', { unique: false });
                    salesStore.createIndex('salesCaptainId', 'salesCaptainId', { unique: false });
                    salesStore.createIndex('saleDate', 'saleDate', { unique: false });
                }

                // Create Staff table
                if (!db.objectStoreNames.contains('staff')) {
                    const staffStore = db.createObjectStore('staff', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    staffStore.createIndex('name', 'name', { unique: false });
                    staffStore.createIndex('role', 'role', { unique: false });
                }
            };
        });
    },

    // Generic CRUD operations
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        data.createdAt = data.createdAt || Date.now();
        data.updatedAt = Date.now();

        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        data.updatedAt = Date.now();

        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);

        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async count(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clear(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Batch operations
    async addBatch(storeName, dataArray) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const results = [];
            let completed = 0;

            dataArray.forEach((data, index) => {
                data.createdAt = data.createdAt || Date.now();
                data.updatedAt = Date.now();

                const request = store.add(data);
                request.onsuccess = () => {
                    results[index] = request.result;
                    completed++;
                    if (completed === dataArray.length) {
                        resolve(results);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        });
    },

    // Specialized queries for analytics
    async getSalesByDateRange(startDate, endDate) {
        const allSales = await this.getAll('sales');
        return allSales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startDate && saleDate <= endDate;
        });
    },

    async getSalesByStore(storeId) {
        return this.getByIndex('sales', 'storeId', storeId);
    },

    async getSalesByStaff(staffId) {
        return this.getByIndex('sales', 'salesCaptainId', staffId);
    },

    async getSalesByProduct(productId) {
        return this.getByIndex('sales', 'productId', productId);
    },

    async getTotalSales() {
        const sales = await this.getAll('sales');
        return sales.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
    },

    async getTopProducts(limit = 5) {
        const sales = await this.getAll('sales');
        const products = await this.getAll('products');

        const productSales = {};
        sales.forEach(sale => {
            if (!productSales[sale.productId]) {
                productSales[sale.productId] = {
                    quantity: 0,
                    totalAmount: 0
                };
            }
            productSales[sale.productId].quantity += sale.quantity;
            productSales[sale.productId].totalAmount += sale.totalAmount;
        });

        const topProducts = Object.entries(productSales)
            .map(([productId, data]) => {
                const product = products.find(p => p.id === parseInt(productId));
                return {
                    product: product,
                    ...data
                };
            })
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, limit);

        return topProducts;
    },

    async getTopStaff(limit = 5) {
        const sales = await this.getAll('sales');
        const staff = await this.getAll('staff');

        const staffSales = {};
        sales.forEach(sale => {
            if (!staffSales[sale.salesCaptainId]) {
                staffSales[sale.salesCaptainId] = {
                    totalSales: 0,
                    totalAmount: 0
                };
            }
            staffSales[sale.salesCaptainId].totalSales++;
            staffSales[sale.salesCaptainId].totalAmount += sale.totalAmount;
        });

        const topStaff = Object.entries(staffSales)
            .map(([staffId, data]) => {
                const staffMember = staff.find(s => s.id === parseInt(staffId));
                return {
                    staff: staffMember,
                    ...data
                };
            })
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, limit);

        return topStaff;
    }
};
