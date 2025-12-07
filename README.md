# AI-Powered RFP Management System

Tech stack:
- Backend: Node.js, Express, Mongoose (MongoDB), OpenAI, Nodemailer (SMTP), IMAPFlow (IMAP)
- Frontend: React + Vite

## Prerequisites
- Node.js 18+
- MongoDB running locally or via a connection string
- Email SMTP + IMAP credentials (can use any provider)
- OpenAI API key

## Setup

1) Backend
```
cd server
cp .env.example .env
# fill environment variables
npm install
npm run dev
```

2) Frontend
```
cd client
npm install
npm run dev
```

The frontend dev server proxies API calls to the backend.

## Env (server/.env)
- PORT
- MONGODB_URI
- OPENAI_API_KEY
- SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASS, SMTP_FROM
- IMAP_HOST, IMAP_PORT, IMAP_SECURE (true/false), IMAP_USER, IMAP_PASS, IMAP_MAILBOX (e.g. INBOX)
- APP_BASE_URL (external URL used inside emails for context)

## Workflow
- Create RFP from natural language (AI turns it into structured RFP)
- Manage vendors
- Send RFP to selected vendors (via email)
- Receive vendor responses via IMAP pull endpoint, AI-parsed into proposals
- Compare proposals and see AI recommendation
