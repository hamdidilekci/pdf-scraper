# PDF Scraper App

A production-ready Next.js application that allows users to upload and extract structured data from PDF files using OpenAI. The application handles different PDF types, stores results in a Supabase database, and presents a clear, responsive interface.

## Features

- **Authentication**: NextAuth with credentials (username/password)
- **PDF Upload**: Drag-and-drop interface with file validation (≤10MB, PDF only)
- **Data Extraction**: OpenAI-powered structured JSON extraction from resume PDFs
- **Database Storage**: Supabase Postgres with Prisma ORM
- **File Storage**: Supabase Storage for PDF files
- **Responsive UI**: TailwindCSS with toast notifications
- **Type Safety**: Full TypeScript with Zod validation

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
   - Copy `env.example` to `.env` and fill in the values:
   - `DATABASE_URL`: Supabase Postgres connection string
   - `DIRECT_URL`: Supabase direct connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase anon key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NEXTAUTH_SECRET`: A strong random string
   - `NEXTAUTH_URL`: `http://localhost:3000` locally

3. **Database setup:**
```bash
npx prisma generate
npx prisma db push
```

4. **Run the development server:**
```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage

1. **Sign up** at `/sign-up` or **sign in** at `/sign-in`
2. **Upload a PDF** at `/upload` - drag and drop or click to select
3. **View results** at `/resumes` - see all your uploaded files
4. **View details** - click on any resume to see the extracted JSON data

## Architecture

### PDF Extraction Method

This application uses OpenAI's Responses API with native PDF handling:

- **Server-side extraction**: The original PDF from Supabase Storage is uploaded to OpenAI Files API (`purpose: user_data`). Then the Responses API is called referencing that file with a strict JSON-extraction prompt (e.g., `gpt-4.1`/`gpt-4o`).
- **Internal OCR**: OpenAI handles text and image-based PDFs internally (no client-side rendering or custom OCR).
- **Validation**: The JSON is validated with Zod and stored on the resume record.

### File Handling Strategy
- **Files >4MB**: Direct upload to Supabase Storage via signed URLs (bypasses Vercel's 4MB payload limit)
- **OpenAI Files + Responses**: Server downloads the PDF bytes from Supabase, uploads to OpenAI Files API, then calls Responses API with the uploaded `file_id` and extraction prompt.
- **Structured Output**: Extracts data into standardized JSON using Zod validation

### Data Flow
1. User uploads PDF → Supabase Storage
2. Client calls `/api/extract/responses` with `storagePath`
3. Server downloads PDF → uploads to OpenAI Files API → calls Responses API with `file_id`
4. Server parses output JSON → validates → stores in DB
5. Results displayed in UI

### Cost Considerations

- **OpenAI API costs apply per extraction**
- **Approximate cost**: $0.01-0.05 per resume (depending on PDF size/complexity)
- **Model used**: GPT-4o-mini (cost-effective for resume processing)
- **Token limits**: 4000 max tokens per extraction to balance cost and completeness

### Limits

- **Maximum PDF size**: 10 MB (Supabase Storage upload limit)
- **Vercel serverless function timeout**: 10 seconds (Hobby plan)
- **Processing time**: Typically 2-5 seconds per PDF
- **Concurrent extractions**: Limited by Vercel's function concurrency

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS
- **Authentication**: NextAuth with Credentials provider
- **Database**: Supabase Postgres with Prisma ORM
- **File Storage**: Supabase Storage
- **AI**: OpenAI Files + Responses API (e.g., `gpt-4.1`, `gpt-4o`, `gpt-4o-mini`)
- **Validation**: Zod for schema validation
- **UI**: Sonner for toast notifications

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── api/             # API routes
│   ├── resumes/         # Resume management pages
│   └── upload/          # Upload page
├── components/          # Reusable UI components
├── lib/                 # Utilities and configurations
├── prisma/              # Database schema
└── types/               # TypeScript type definitions
```

## Stripe Integration

This application supports an optional Stripe subscription-based credit system. The app runs independently without Stripe configured.

### Stripe Setup

1. **Create a Stripe Test Account**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
   - Navigate to Developers → API keys
   - Copy your **Secret key** (starts with `sk_test_`) and **Publishable key** (starts with `pk_test_`)

2. **Create Subscription Products**:
   - Go to Products → Add Product
   - Create two products:
     - **Basic Plan**: $10/month, Recurring subscription
     - **Pro Plan**: $20/month, Recurring subscription
   - Copy the **Price ID** for each product (starts with `price_`)

3. **Configure Webhooks** (for local development):
   - Install Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Copy the webhook signing secret (starts with `whsec_`)

4. **Environment Variables**:
   Add to your `.env` file:
   ```bash
   # Stripe Configuration (Optional - app works without these)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_BASIC=price_...  # Basic plan price ID
   STRIPE_PRICE_PRO=price_...    # Pro plan price ID
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
   ```

### Credit System

- **1 resume extraction = 100 credits**
- **Basic Plan**: 10,000 credits ($10/month)
- **Pro Plan**: 20,000 credits ($20/month)
- Credits are deducted after successful extraction
- Users start with 0 credits (must subscribe to get credits)

### Subscription Flow

1. User visits `/settings` page
2. Clicks "Subscribe to Basic Plan" or "Upgrade to Pro Plan"
3. Redirected to Stripe Checkout
4. After successful payment, webhook adds credits and activates subscription
5. User can manage billing via "Manage Billing" button (Stripe Customer Portal)

### Webhook Events Handled

- `checkout.session.completed` - Activates subscription and adds credits
- `customer.subscription.updated` - Handles plan changes (upgrades/downgrades)
- `customer.subscription.deleted` - Deactivates subscription
- `invoice.paid` - Adds credits for subscription renewals

### Testing Subscription Flow

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date and CVC
3. Any postal code
4. Complete checkout to receive test credits

### Production Deployment

For production:
1. Use Stripe Live mode keys
2. Configure webhook endpoint in Stripe Dashboard: `https://yourdomain.com/api/webhooks/stripe`
3. Copy the production webhook signing secret
4. Update environment variables with live keys

## Development Notes

- All routes are protected by default via `middleware.ts`
- Passwords are hashed with bcrypt (minimum 8 characters)
- Uses Supabase for both database and file storage
- OpenAI integration with structured JSON output
- Comprehensive error handling and user feedback
- **Stripe integration is optional** - app functions without Stripe configured