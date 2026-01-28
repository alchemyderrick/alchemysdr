# SDR Console - Project Documentation

This document provides a comprehensive overview of the SDR Console application for AI assistants and developers.

## Overview

SDR Console is a sales development representative toolkit that combines AI-powered research, automated outreach, and team collaboration features. It's built with Next.js frontend, Express backend, and SQLite databases with per-employee isolation.

## Architecture

- **Frontend**: Next.js 14 (App Router) at `frontend/`
- **Backend**: Express.js at `backend/`
- **Database**: SQLite with per-employee isolation at `databases/{employeeId}/data.db`
- **Auth Database**: Shared at `databases/auth.db`
- **AI**: Claude (Anthropic) for message generation, research, and vision
- **Enrichment**: Apollo.io API (optional)

## Page Routes & Features

### Dashboard (`/`)
- Messages sent today counter (since midnight EST)
- Companies to follow up counter (48+ hours since last message)
- Add contact card for quick contact creation
- Discover X card for Twitter user discovery
- Send queue card showing messages pending approval/sending

### Targets Page (`/targets`)
- View and manage pending targets requiring approval
- Approve or dismiss targets
- Edit target details (company name, website, X handle, funding, revenue)
- Bulk import targets from CSV/JSON
- Research targets from website URLs using Claude + Apollo

### Active Outreach (`/active`)
- Shows approved targets that have sent messages
- Discover X/Twitter users per target
- Search all contacts for targets
- View and manage contact lists
- Add contacts manually
- Enrich unenriched companies with Apollo/Claude

### Approved Page (`/approved`)
- Shows approved targets without any sent messages yet
- Discover X users, search contacts, manage contact lists
- Dismiss or delete targets

### Follow-ups (`/followups`)
- View contacts with sent messages requiring follow-up (48+ hours old)
- Generate follow-up messages using Claude
- Track follow-up status and message history

### W Messaging / Wins (`/wins`)
- Shared repository of successful messages from all team members
- View full message + response pairs
- Filter by message type (initial vs follow-up)
- Share successful messaging patterns across team

### Support Bot (`/support`)
- AI customer support response generator
- Uses Claude + Alchemy documentation for context
- Quick feedback options: More Technical, Shorter, Friendlier, Add Docs Links
- Copy responses to clipboard

### Admin Dashboard (`/admin`)
- View all employees/users
- Create new users (regular or admin)
- Impersonate employees to view their data
- View employee statistics (targets, contacts, drafts, sent messages)

### Authentication (`/login`, `/register`)
- Session-based authentication
- Self-service user registration
- Password validation (min 8 characters)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/bootstrap-admin` - Create first admin (only if no users exist)

### Admin
- `POST /api/admin/impersonate` - Impersonate employee
- `POST /api/admin/stop-impersonate` - Stop impersonating
- `GET /api/admin/employees` - List all employees
- `GET /api/admin/employees/:employeeId/stats` - Employee statistics
- `POST /api/admin/create-user` - Create new user

### Targets
- `GET /api/targets` - Get pending targets
- `GET /api/targets/approved` - Get approved targets
- `POST /api/targets/:id/approve` - Approve target
- `POST /api/targets/:id/dismiss` - Dismiss target
- `DELETE /api/targets/:id` - Delete target
- `PATCH /api/targets/:id` - Edit target
- `POST /api/targets/research` - Auto-research companies
- `POST /api/targets/import` - Bulk import targets
- `POST /api/targets/research-url` - Research from URL

### Target Enrichment
- `POST /api/targets/:id/find-contacts` - Find team members via Claude
- `POST /api/targets/:id/all-contacts` - Search all employees (Apollo + Claude)
- `POST /api/targets/:id/discover-x-users` - Discover X/Twitter users via Puppeteer
- `POST /api/targets/:id/find-website` - Find company website
- `POST /api/targets/:id/find-x-handle` - Find company X handle
- `POST /api/targets/:id/enrich` - Enrich target with Apollo/Claude

### Contacts
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/targets/:id/view-contacts` - Get contacts for target

### Drafts
- `GET /api/drafts` - Get all drafts
- `GET /api/drafts/sent` - Get sent messages
- `GET /api/drafts/followups` - Get follow-up messages
- `POST /api/drafts/generate` - Generate message draft
- `POST /api/drafts/:id/regenerate` - Regenerate with feedback
- `POST /api/drafts/:id/approve` - Approve for sending
- `POST /api/drafts/:id/dismiss` - Dismiss draft
- `POST /api/drafts/:id/responded` - Mark as responded (saves to wins)
- `POST /api/drafts/:id/capture` - Capture Telegram response

### Support Bot
- `POST /api/support/generate` - Generate support response

### Shared Wins
- `GET /api/shared/successful-messages` - Get all successful messages
- `POST /api/shared/successful-messages` - Save successful message
- `DELETE /api/shared/successful-messages/:id` - Delete message

### Relayer (Mac automation client)
- `GET /api/relayer/approved-pending` - Get drafts to send
- `POST /api/relayer/mark-prepared/:id` - Mark as sent
- `POST /api/relayer/mark-failed/:id` - Mark as failed
- `GET /api/relayer/capture-requests` - Get capture requests
- `POST /api/relayer/capture-complete/:id` - Submit captured response

## Database Schema

### contacts
`id, name, company, title, telegram_handle, notes, email, x_username, x_bio, source, telegram_validated, telegram_validation_date, created_at`

### drafts
`id, contact_id, channel, message_text, status (queued|approved|sent|dismissed|followup), prepared_at, created_at, updated_at`

### targets
`id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status (pending|approved|dismissed|active), created_at, updated_at`

### discovered_contacts
`id, target_id, name, title, email, phone, linkedin, telegram_handle, apollo_id, apollo_confidence_score, source (web_search|apollo), discovered_at`

### successful_messages
`id, contact_id, contact_name, company, telegram_handle, message_text, message_type (initial|followup), their_response, created_at`

### shared_successful_messages
`id, submitted_by, contact_name, company, telegram_handle, message_text, message_type, their_response, created_at`

## Key Integrations

### Claude AI (Anthropic)
- Message generation (outbound Telegram messages)
- Message regeneration with feedback
- Follow-up generation
- Support response generation with Alchemy docs
- Company research from websites
- Team member discovery and verification
- Vision for screenshot analysis

### Apollo.io API (optional)
- Organization enrichment (website, description, employee count)
- Contact enrichment with confidence scores
- Falls back to Claude-only if not configured

### X/Twitter (via Puppeteer)
- Authenticated search for company employees
- User discovery and profile extraction
- Per-employee X cookie storage

### Telegram (Mac only)
- Desktop automation via AppleScript
- Message sending with paragraph splitting
- Response screenshot capture
- Auto-send after idle time

## Environment Variables

```env
# Required
ANTHROPIC_API_KEY=       # Claude API access
SESSION_SECRET=          # Session encryption (required for production)

# Optional
APOLLO_API_KEY=          # Apollo.io enrichment
RELAYER_API_KEY=         # Mac client authentication
FRONTEND_URL=            # CORS origin
DATABASE_DIR=            # Base directory for databases
PORT=3000                # Server port

# Telegram Automation
AUTO_SEND_ENABLED=true
AUTO_SEND_IDLE_SECONDS=5
PARAGRAPH_SEND_DELAY_MS=1500
```

## Multi-Employee Architecture

- Each employee gets isolated database at `databases/{employeeId}/data.db`
- Shared auth database at `databases/auth.db`
- Admin impersonation for viewing employee data
- Per-employee X cookie storage in employee_config table
- Shared API keys (ANTHROPIC_API_KEY, APOLLO_API_KEY)

## Key Files

### Backend
- `backend/server.js` - Main Express server
- `backend/routes/` - API route handlers
- `backend/lib/claude.js` - Claude AI integration
- `backend/lib/apollo.js` - Apollo.io integration
- `backend/lib/workflow-engine.js` - Multi-step workflow orchestration
- `backend/lib/helpers.js` - Mac automation helpers (AppleScript)
- `backend/lib/x-discovery.js` - X/Twitter user discovery
- `backend/database/` - Database setup and migrations

### Frontend
- `frontend/app/` - Next.js App Router pages
- `frontend/components/` - React components
- `frontend/lib/api.ts` - API client functions

## Common Workflows

### Adding a New Target
1. Import via CSV/JSON or research from URL
2. Target appears in `/targets` as pending
3. Review and approve target
4. Target moves to `/approved`

### Outreach Flow
1. Discover X users or search contacts for approved target
2. Generate message drafts for contacts
3. Review and approve drafts in send queue
4. Mac relayer sends via Telegram
5. Track responses, mark as responded
6. Share successful messages to wins

### Follow-up Flow
1. Contacts with 48+ hour old messages appear in `/followups`
2. Generate follow-up messages
3. Approve and send via relayer
