# Arunya ERP

Enterprise Resource Planning system for Arunya Natural Products.

## Tech Stack

- **Next.js 16** - Full-stack React framework
- **Prisma** - Type-safe database ORM
- **Turso** - SQLite-compatible cloud database
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js** - Authentication

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `TURSO_DATABASE_URL` - Your Turso database URL
- `TURSO_AUTH_TOKEN` - Your Turso auth token
- `NEXTAUTH_SECRET` - Random string for session encryption
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for local)

### 3. Set up the database

```bash
npm run db:setup
```

This creates the database tables and an admin user:
- Email: `admin@arunya.com`
- Password: `admin123`

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

The app is configured for Vercel deployment:

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Modules

| Module | Status |
|--------|--------|
| Auth/Users | ✅ Complete |
| Products | ✅ Complete |
| Stores | ✅ Complete |
| Orders | ✅ Complete |
| Invoices | ⏳ Pending |
| Payments | ⏳ Pending |
| Inventory | ⏳ Pending |
| Production | ⏳ Pending |
| Dashboard | ⏳ Pending |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup` - Initialize database
- `npm run db:generate` - Generate Prisma client
