# iljar

Podiatry clinic management system - MVP for solo practitioners.

## Features

- **5-10 second booking** - Quick appointment scheduling
- **1-2 tap patient history** - Easy access to medical records
- **Secure image storage** - SOAP notes with photo documentation
- **Offline support** - Read-only access to recent visits

## Project Execution & Tracking

- Implementation plan and progress tracker: [PROJECT_EXECUTION_PLAN.md](PROJECT_EXECUTION_PLAN.md)

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with 2FA (TOTP)
- **Storage**: S3-compatible object storage
- **UI**: React + Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- S3-compatible storage (AWS S3, MinIO, etc.)

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/e-magnus/iljar.git
cd iljar
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your database and S3 credentials.

### 3. Database Setup

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

Quick start for local DB (starts/creates `iljar-postgres` Docker container + applies migrations):

```bash
npm run db:up
```

Generate Prisma Client:

```bash
npx prisma generate
```

### 4. Seed Data (Required for Login)

Populate the database with synthetic test data including a test user:

```bash
npm run seed
```

This creates a test user with credentials:
- **Email**: `clinician@iljar.is`
- **Password**: `password123`

### 5. Run Development Server

```bash
npm run dev
```

`npm run dev` now does local bootstrap automatically:
- starts local Postgres + runs migrations (`npm run db:up`)
- checks if seed data exists
- runs `npm run seed` only when data is missing
- starts Next.js dev server

Open [http://localhost:3000/login](http://localhost:3000/login) in your browser and log in with the test credentials above.

## Available Scripts

- `npm run dev` - Start development server
- `npm run dev:app` - Start Next.js dev server only (no DB/seed bootstrap)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:auth` - Run auth/route-protection smoke tests
- `npm run seed` - Seed database with test data
- `npm run db:up` - Start local Postgres container and apply migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Project Structure

```
iljar/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   └── (routes)/     # Page routes
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   │   ├── auth/         # Authentication logic
│   │   ├── db/           # Database utilities
│   │   └── services/     # Business logic
│   └── types/            # TypeScript types
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed script
└── public/               # Static assets
```

## Security

- All PHI (Protected Health Information) is encrypted at rest
- JWT tokens with short expiration times
- 2FA authentication with TOTP
- Audit logging for all sensitive operations
- Signed URLs for image access
- No real patient data in development/test environments

## Database Backups

The project includes an automated backup script for PostgreSQL databases.

### Setting up daily backups

1. Configure environment variables in `/etc/cron.daily/iljar-backup`:

```bash
export DB_NAME="iljar_production"
export DB_USER="postgres"
export DB_PASSWORD="your-password"
export DB_HOST="localhost"
export DB_PORT="5432"
export BACKUP_DIR="/var/backups/iljar"
export RETENTION_DAYS="30"

/path/to/iljar/scripts/backup.sh
```

2. Make the cron script executable:

```bash
sudo chmod +x /etc/cron.daily/iljar-backup
```

3. Test the backup:

```bash
sudo /etc/cron.daily/iljar-backup
```

Backups are compressed and retained for 30 days by default. Old backups are automatically removed.

### Manual backup

```bash
cd scripts
./backup.sh
```

## MVP Milestones

### ✅ M1: Core Scheduling Demo (COMPLETE)
- [x] Initialize project structure
- [x] Database schema
- [x] Authentication (email/password + 2FA)
- [x] Availability management
- [x] Slot generation with buffer time
- [x] Appointment booking with overlap validation
- [x] Dashboard showing next appointment and next available slot
- [x] Booking wizard with slots day view

### ✅ M2: Clinical Workflow (COMPLETE)
- [x] Appointment details with visit history (last 3 visits)
- [x] Mark patient as arrived
- [x] SOAP note entry with templates
- [x] Photo upload with consent tracking
- [x] 4-tap booking flow UI
- [x] Visit recording UI with photo upload

### 🔨 M3: Security Hardening (IN PROGRESS)
- [x] Audit log middleware
- [ ] Encrypted local cache (IndexedDB)
- [ ] Image cache controls  
- [x] Backup automation with retention policy
- [x] Performance testing script

## Features Implemented

### Authentication & Security
- ✅ Email and password authentication with bcrypt
- ✅ JWT tokens with configurable expiration
- ✅ 2FA with TOTP (Google Authenticator compatible)
- ✅ QR code generation for 2FA setup
- ✅ Audit logging for all sensitive operations

### Appointment Management
- ✅ Create, view, and update appointments
- ✅ Overlap validation
- ✅ Status tracking (Booked, Arrived, Completed, Cancelled, No Show)
- ✅ Client association
- ✅ Appointment notes

### Scheduling
- ✅ Configurable working hours by weekday
- ✅ Slot generation with configurable length and buffer time
- ✅ Time-off management
- ✅ Next available slot lookup
- ✅ Slots filtered by existing appointments

### Clinical Documentation
- ✅ SOAP format (Subjective, Objective, Assessment, Plan)
- ✅ Visit history (last 3 visits shown on appointment detail)
- ✅ Pre-defined templates for common conditions
- ✅ Photo documentation (Before/After)
- ✅ Consent tracking with timestamp

### Photo Management
- ✅ S3-compatible storage integration
- ✅ Signed URLs for secure upload/download
- ✅ Photo type categorization (Before/After)
- ✅ Automatic consent timestamp on upload
- ✅ Audit logging for photo operations

### Data Management
- ✅ Client management (create, search)
- ✅ Synthetic data seeding (10 clients, 30 appointments)
- ✅ Automated PostgreSQL backups
- ✅ 30-day backup retention policy

### User Interface
- ✅ Dashboard with next appointment and next available slot
- ✅ 4-step booking wizard (Date → Time → Client → Confirm)
- ✅ Appointment detail page with visit history
- ✅ SOAP note entry form with templates
- ✅ Photo upload with preview
- ✅ Responsive design (mobile-first)
- ✅ Icelandic language interface

## Performance

- ✅ Slot generation optimized for < 1 second with 100 appointments
- ✅ Database queries with proper indexing
- ✅ Next.js static generation where possible
- ✅ Efficient data fetching patterns

## Testing

Run performance tests:
```bash
npm run perf:test
```

This will:
- Create 100 test appointments
- Measure slot generation performance
- Report average, min, and max response times
- Verify performance is under 1 second
- Clean up test data

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team.
