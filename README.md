# Arunya Consumables ERP System

A comprehensive Enterprise Resource Planning system for Arunya Consumables Private Limited.

## Features

### Sales Module
- Store management with area grouping
- Invoice generation with GST compliance
- Margin management per product per store
- Sales captain tracking and performance

### Product Module
- Product master with HSN codes
- Category management
- Stock tracking

### Purchase Module
- Vendor management with payment terms
- Raw material receipt tracking
- Packing order management
- Dispatch management with priority

### Staff Module
- Attendance tracking
- Leave management
- Salary structure and payments
- Payslip generation

## Tech Stack

- **Frontend**: React with TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MySQL
- **PDF Generation**: PDFKit

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE arunya_erp;
```

2. Run the migration script:
```bash
cd backend
npm run migrate
```

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Default Login

- **Email**: admin@arunya.com
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Stores
- `GET /api/stores` - List all stores
- `POST /api/stores` - Create store
- `GET /api/stores/:id/margins` - Get store margins

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### And more...

## Project Structure

```
arunya-erp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── utils/
│   └── package.json
├── database/
│   └── migrations/
├── docker-compose.yml
└── README.md
```

## Docker Deployment

```bash
docker-compose up -d
```

## License

Private - Arunya Consumables Private Limited
# onaturals
