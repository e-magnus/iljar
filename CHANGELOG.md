# Changelog

All notable changes to the iljar project.

## [Unreleased]

### Changed

- `npm run dev` now bootstraps local development automatically by running DB startup/migrations (`db:up`), checking seed presence, and only seeding when data is missing.
- Added `npm run dev:app` for starting `next dev` without DB/seed bootstrap.
- Removed manual consent checkbox from visit/client photo upload UI; consent metadata remains recorded automatically on upload.
- Mobile UX refinements across booking, clients, and calendar screens with larger touch targets and sticky/fixed action controls.
- Booking flow now supports mobile step navigation with tappable step indicators and a persistent bottom action bar (`Til baka`, `Áfram`, `Staðfesta`).
- Appointment event workflow updated: removed standalone “Merkja mætt” action, added dedicated “Merkja skróp”, and improved rescheduling flow.
- Appointment rescheduling now uses booking-style date selection with month view and available-hours-per-day indicators before selecting a new slot.
- Appointment detail layout simplified by removing duplicated client info and replacing right column with focused quick actions.

### Added

- Auth/route-protection smoke test suite (`npm run test:auth`) covering:
  - auth guard behavior for missing/valid bearer token
  - protected route `401` behavior
  - refresh error contract (`REFRESH_REQUIRED`, `REFRESH_INVALID`)
  - public login route accessibility
- `scripts/ensure-seed.ts` helper to detect seed baseline and run `npm run seed` only when needed.

### Fixed

- Production build TypeScript compatibility in JWT token generation by aligning `expiresIn` env values with `jsonwebtoken` `SignOptions` typings.

### Added

#### Foundation (MVP-001 to MVP-002)
- Next.js 15 project with TypeScript and App Router
- Prisma ORM with PostgreSQL adapter (Prisma v7 compatible)
- Complete database schema with 9 models:
  - User (clinician authentication)
  - Client (patient information)
  - Appointment (time bookings)
  - Visit (SOAP clinical notes)
  - Photo (before/after images)
  - AvailabilityRule (working hours)
  - TimeOff (vacation/blocked time)
  - AuditLog (security tracking)
  - Settings (system configuration)

#### Authentication & Security (MVP-003, MVP-004, MVP-014)
- Email and password authentication with bcrypt hashing
- JWT access and refresh tokens with configurable expiration
- 2FA with TOTP (Google Authenticator compatible)
- QR code generation for 2FA setup
- Audit logging middleware for all sensitive operations
- PHI protection with encrypted storage

#### API Endpoints (MVP-005 to MVP-013)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login with optional 2FA
- `POST /api/auth/totp` - Generate TOTP secret
- `PATCH /api/auth/totp` - Enable 2FA
- `GET /api/availability` - List availability rules
- `POST /api/availability` - Create availability rule
- `GET /api/clients` - List/search clients
- `POST /api/clients` - Create client
- `GET /api/slots` - Get available slots for a date
- `GET /api/slots?next=true` - Find next available slot
- `GET /api/appointments` - List appointments
- `GET /api/appointments?next=true` - Get next appointment
- `POST /api/appointments` - Create appointment with overlap validation
- `GET /api/appointments/[id]` - Get appointment with last 3 visits
- `PATCH /api/appointments/[id]` - Update appointment (mark arrived, etc.)
- `POST /api/visits` - Create visit with SOAP notes
- `POST /api/photos` - Generate signed upload URL for photos

#### Services & Business Logic (MVP-006)
- Slot generation service with configurable slot length and buffer time
- Overlap detection for appointments
- Next available slot finder (scans up to 30 days ahead)
- Availability rule processing by weekday
- Time-off blocking
- S3-compatible storage service with signed URLs

#### User Interface (MVP-015 to MVP-019)
- Dashboard showing next appointment and next available slot
- Quick action cards for navigation
- 4-step booking wizard:
  1. Select date
  2. Select time slot
  3. Select client (with search)
  4. Confirm booking
- Appointment detail page:
  - Client information
  - Appointment time and status
  - Last 3 visits with SOAP notes
  - Mark as arrived button
  - Link to record new visit
- Visit recording form:
  - SOAP note entry (Subjective, Objective, Assessment, Plan)
  - Pre-defined templates for common conditions
  - Photo upload (Before/After)
  - Photo preview and removal
- Responsive design optimized for mobile devices
- Icelandic language interface

#### Photo Management (MVP-012, MVP-013)
- S3-compatible storage integration
- Signed URL generation for secure uploads
- Automatic file key generation with timestamps
- Photo type categorization (BEFORE/AFTER)
- Consent tracking with automatic timestamp
- Audit logging for photo operations

#### Data & Operations (MVP-022, MVP-023, MVP-024)
- Seed script generating:
  - Default settings
  - Monday-Friday working hours (9:00-17:00)
  - 10 synthetic clients with Icelandic names
  - 30 appointments over 2 weeks
  - 10 completed visits with SOAP notes
  - Sample audit log entries
- Automated PostgreSQL backup script:
  - Compressed backups (.sql.gz)
  - Configurable retention period (default 30 days)
  - Automatic cleanup of old backups
  - Cron integration support
- Performance testing script:
  - Creates 100 test appointments
  - Measures slot generation performance
  - Verifies < 1 second response time
  - Automatic cleanup

### Technical Implementation

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with server-side rendering
- **Database**: PostgreSQL with Prisma ORM v7
- **Authentication**: JWT with bcrypt, speakeasy (TOTP)
- **Storage**: AWS SDK for S3-compatible object storage
- **Code Quality**: ESLint with Next.js config, TypeScript strict mode
- **Package Manager**: npm

### Performance
- Slot generation optimized for < 1 second with 100 appointments
- Efficient database queries with proper indexing
- Static page generation where applicable

### Security
- All passwords hashed with bcrypt (10 rounds)
- JWT tokens with short expiration (15 minutes default)
- 2FA with time-based one-time passwords
- Audit logging for PHI access
- Signed URLs with expiration for photo access
- No real patient data in development/test environments

## [0.1.0] - MVP Release

Initial MVP release with core scheduling and clinical workflow features.
