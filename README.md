# iljar

Podiatry clinic management system - MVP for solo practitioners.

## Features

- **5-10 second booking** - Quick appointment scheduling
- **1-2 tap patient history** - Easy access to medical records
- **Secure image storage** - SOAP notes with photo documentation
- **Offline support** - Read-only access to recent visits

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

Generate Prisma Client:

```bash
npx prisma generate
```

### 4. Seed Data (Optional)

Populate the database with synthetic test data:

```bash
npm run seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run seed` - Seed database with test data
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

## MVP Milestones

### M1: Core Scheduling Demo
- [x] Initialize project structure
- [x] Database schema
- [ ] Authentication (email/password + 2FA)
- [ ] Availability management
- [ ] Slot generation
- [ ] Appointment booking
- [ ] Dashboard and slots view

### M2: Clinical Workflow
- [ ] Appointment details with visit history
- [ ] Mark patient as arrived
- [ ] SOAP note entry
- [ ] Photo upload with consent
- [ ] Booking flow UI
- [ ] Visit recording UI

### M3: Security Hardening
- [ ] Audit log middleware
- [ ] Encrypted local cache
- [ ] Image cache controls
- [ ] Backup automation
- [ ] Performance testing

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team.
