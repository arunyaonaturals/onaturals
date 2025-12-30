# ARUNYA CONSUMABLES - Quick Start Guide

## 🚀 Getting Started

### First Time Setup
1. **Open the Application**
   - Double-click `index.html` in the `/Users/sanjaydakshinamoorthy/Desktop/Arunaya` folder
   - OR open it directly in your browser

2. **Add Your Data in This Order:**
   ```
   1. Staff → Add sales captains and distributors
   2. Products → Add your product catalog with prices
   3. Stores → Add stores manually OR import from CSV
   4. Sales → Start recording transactions
   ```

---

## 📊 CSV Import Format for Stores

Create a CSV file with these exact column headers:
```csv
Store Name,Area,Distributor,Sales Captain,Beat,Contact Number
ABC Store,Velachery,John Distributors,Raj Kumar,Beat 1,9876543210
XYZ Mart,Adyar,Smith & Co,Priya Devi,Beat 2,9876543211
```

**To Import:**
1. Go to **Stores** page
2. Click **Import CSV**
3. Select your CSV file
4. Click **Import**

---

## 💡 Key Features

### Dashboard 📈
- View real-time statistics
- See sales trends (last 7 days)
- Check top products and performers
- Monitor recent activity

### Stores 🏪
- **Add**: Individual store with all details
- **Import**: Bulk upload via CSV
- **Search**: Find stores quickly
- **Edit/Delete**: Manage store information

### Products 📦
- **Add**: Products with code, name, price, category
- **Organize**: By categories
- **Search**: Find products instantly
- **Manage**: Edit or remove products

### Sales 💰
- **Record**: New sales transactions
- **Auto-calculate**: Total amount from quantity × price
- **Track**: By store, product, and sales captain
- **View**: Detailed sale information
- **Search**: Find specific transactions

### Staff 👥
- **Add**: Sales team members
- **Roles**: Sales Captain, Distributor, Manager, Supervisor
- **Assign**: Beats to staff members
- **Contact**: Phone and email validation

---

## 🎯 Sample Workflow

### Day 1: Initial Setup
```
1. Add 5 staff members (Sales Captains)
2. Add 20 products from your catalog
3. Import 50+ stores from CSV
```

### Day 2: Start Recording
```
1. Record daily sales transactions
2. Link each sale to store, product, and captain
3. View dashboard for insights
```

### Ongoing: Track & Analyze
```
1. Monitor sales trends
2. Identify top products
3. Track staff performance
4. Search historical data
```

---

## 🔍 Tips & Tricks

### Search Functionality
- Search works across **all fields**
- No need to be exact - partial matches work
- Case-insensitive

### Navigation
- Use sidebar menu to switch between sections
- Browser back/forward buttons work
- URLs are bookmarkable (e.g., `#stores`, `#sales`)

### Data Persistence
- All data saved automatically to your browser
- No internet required after first load
- Data persists across sessions

### Best Practices
1. **Regular Backups**: Browser data can be cleared - plan accordingly
2. **Product Codes**: Use unique codes for each product
3. **Phone Numbers**: Enter 10-digit numbers only
4. **CSV Import**: Match column names exactly

---

## ⚙️ Technical Details

- **Database**: IndexedDB (local browser storage)
- **Capacity**: Thousands of records
- **Offline**: Works without internet
- **Browser**: Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design included

---

## 📞 Support Information

For questions or issues:
- Review the full [walkthrough.md](file:///Users/sanjaydakshinamoorthy/.gemini/antigravity/brain/1804099a-0898-4744-b6f0-5d76b3859cd1/walkthrough.md) documentation
- Check browser console (F12) for errors
- Ensure using a modern browser (not IE)

---

## 🎨 Application Files

```
Arunaya/
├── index.html          # Main application
├── styles.css          # Design system
├── app.js             # App controller
└── js/
    ├── database.js    # Data management
    ├── dashboard.js   # Dashboard
    ├── stores.js      # Store management
    ├── products.js    # Product management
    ├── sales.js       # Sales tracking
    ├── staff.js       # Staff management
    ├── components.js  # UI components
    └── utils.js       # Utilities
```

---

**🎉 Ready to use! Open `index.html` and start managing your distribution operations.**
