# SDR Console

AI-powered Sales Development Representative automation tool with React/Next.js UI.

## Quick Start

### Development

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start backend API (port 3000)
npm start

# In another terminal, start React UI (port 3001)
cd frontend && npm run dev
```

Then visit **http://localhost:3001** for the UI.

### Production Build

```bash
# Build frontend
npm run build

# Start server (serves both API and React UI)
npm start
```

## Architecture

- **Backend**: Express.js API server (port 3000)
  - REST API endpoints (`/api/*`)
  - SQLite database
  - Puppeteer for X automation
  - Claude AI for message generation

- **Frontend**: Next.js React app (port 3001 in dev)
  - shadcn/ui components
  - Tailwind CSS v4 with OKLCH colors
  - Dark mode support
  - Modern, responsive design

## Features

- **Contact Discovery**: Find and enrich contacts using Apollo API and Claude
- **X (Twitter) Discovery**: Discover users from X company accounts using Puppeteer
- **Message Generation**: AI-powered outreach message creation with Claude
- **Message Queue**: Approve, edit, regenerate, and dismiss drafted messages
- **Follow-ups**: Automated follow-up message generation and tracking
- **Telegram Integration**: Relayer mode for automated message sending

## Environment Variables

Required:
```bash
ANTHROPIC_API_KEY=sk-ant-xxx       # Claude API key
APOLLO_API_KEY=your-apollo-key     # Apollo contact search
RELAYER_API_KEY=random-32-chars    # For Telegram relayer authentication
```

Optional:
```bash
X_COOKIES=[...]                    # X authentication (JSON array)
CLAY_WEBHOOK_URL=https://...       # Clay integration
FRONTEND_URL=http://localhost:3001 # React UI URL
```

## Railway Deployment

The app is configured for Railway deployment with a single service:

1. Push to GitHub → Railway auto-deploys
2. Railway builds the React frontend during deployment
3. Backend serves the built React app + API endpoints
4. Single URL for everything (no separate frontend service needed)

See `RAILWAY_DEPLOY_UPDATED.md` for detailed deployment instructions.

## Project Structure

```
├── server.js              # Express backend
├── lib/                   # Backend utilities
│   ├── database.js        # SQLite setup
│   ├── helpers.js         # Message generation, Telegram utils
│   ├── puppeteer-manager.js # X automation
│   └── workflow-engine.js # Discovery workflows
├── routes/                # API routes
│   ├── drafts.js          # Draft messages
│   ├── contacts.js        # Contact management
│   ├── targets.js         # Target companies
│   └── workflow.js        # Discovery workflows
├── frontend/              # Next.js React app
│   ├── app/               # Pages and layouts
│   ├── components/        # UI components
│   └── lib/               # Frontend utilities
├── railway.toml           # Railway deployment config
└── nixpacks.toml          # Build configuration

```

## API Endpoints

### Drafts
- `GET /api/drafts` - Get all drafts
- `GET /api/drafts/sent` - Get sent messages
- `GET /api/drafts/followups` - Get follow-up messages
- `POST /api/drafts/:id/approve` - Approve message
- `POST /api/drafts/:id/regenerate` - Regenerate message
- `POST /api/drafts/:id/dismiss` - Dismiss message
- `POST /api/drafts/:id/send-followup` - Send follow-up

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create contact (with auto-draft)
- `POST /api/contacts/import-from-targets` - Import from targets
- `POST /api/contacts/:id/search` - Search company contacts

### Targets
- `GET /api/targets` - Get pending targets
- `GET /api/targets/approved` - Get approved targets
- `POST /api/targets/research` - Research new targets (Claude)
- `POST /api/targets/:id/discover-x-users` - Discover X users

### Workflow
- `POST /api/workflow/x-discovery` - Start X discovery workflow
- `GET /api/workflow/status/:workflowId` - Check workflow status

## Development Tips

### Run Backend Only
```bash
npm start
# Visit http://localhost:3000 → redirects to localhost:3001
```

### Run Frontend Only
```bash
cd frontend && npm run dev
# Visit http://localhost:3001
# Configure NEXT_PUBLIC_API_URL if needed
```

### Build for Production
```bash
npm run build    # Builds frontend to frontend/out
npm start        # Serves both API and static React app
```

## Automation Features

### X Discovery
- Uses Puppeteer with Chromium
- Requires X authentication (local: browser, Railway: X_COOKIES env var)
- Discovers team members from company X accounts
- Finds Telegram handles automatically

### Contact Search
- Apollo API for company employee search
- Claude AI for contact enrichment and verification
- Telegram handle discovery across multiple patterns

### Message Generation
- Claude AI with examples from `Successful SDR Messaging.txt`
- Variety seeds ensure unique messages every time
- Auto-saves approved messages for training

### Telegram Automation
- **Local**: Opens Telegram Desktop and pastes messages
- **Railway**: Use relayer mode (local client + Railway API)

## License

ISC
