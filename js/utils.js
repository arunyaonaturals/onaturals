// ================================
// Utility Functions
// ================================

const Utils = {
    // Date formatting
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format date as dd/mm/yyyy
    formatDateDDMMYYYY(date) {
        if (!date || date === '-') return '-';

        // If already in dd/mm/yyyy format, return as is
        if (date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            return date;
        }

        // Convert yyyy-mm-dd to dd/mm/yyyy
        const d = new Date(date);
        if (isNaN(d.getTime())) return date; // Invalid date, return as is

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    },

    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Currency formatting
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    // Number formatting
    formatNumber(num) {
        return new Intl.NumberFormat('en-IN').format(num || 0);
    },

    // Percentage formatting
    formatPercent(value) {
        return `${(value || 0).toFixed(1)}%`;
    },

    // Generate unique ID
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    },

    // Export to CSV
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            UI.showToast('No data to export', 'error');
            return;
        }

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = String(value).replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                }).join(',')
            )
        ].join('\n');

        this.downloadFile(csv, filename, 'text/csv');
    },

    // Download file helper
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // Parse CSV - handles quoted fields with commas
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        // Function to parse a single CSV line respecting quotes
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // End of field
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            // Push last field
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            data.push(obj);
        }

        return data;
    },

    // Validation helpers
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidPhone(phone) {
        return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Search/filter helper
    searchInObject(obj, searchTerm) {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return Object.values(obj).some(value =>
            String(value).toLowerCase().includes(term)
        );
    },

    // Sort array of objects
    sortBy(array, key, ascending = true) {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }
};
