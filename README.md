# PDF Scraper App

A production-ready Next.js application that allows users to upload and extract structured data from PDF files using OpenAI. The application handles different PDF types, stores results in a Supabase database, and presents a clear, responsive interface.

## Features

- **Authentication**: NextAuth with credentials (email/password)
- **Password Reset**: Secure password reset with OTP verification via email
- **Brute Force Protection**: Rate limiting on login attempts (5 attempts per 15 minutes)
- **PDF Upload**: Drag-and-drop interface with file validation (≤10MB, PDF only)
- **Data Extraction**: OpenAI-powered structured JSON extraction from resume PDFs
- **Database Storage**: Supabase Postgres with Prisma ORM
- **File Storage**: Supabase Storage for PDF files
- **Email Service**: Resend integration for password reset emails
- **Subscription System**: Optional Stripe-based credit system
- **Responsive UI**: TailwindCSS with toast notifications
- **Type Safety**: Full TypeScript with Zod validation
- **Automated Cleanup**: Cron jobs for database maintenance

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
   - Copy `env.example` to `.env` and fill in the values:
   
   **Required:**
   - `DATABASE_URL`: Supabase Postgres connection string
   - `DIRECT_URL`: Supabase direct connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `SUPABASE_STORAGE_BUCKET`: Storage bucket name (default: `pdfs`)
   - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase anon key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: `http://localhost:3000` locally
   
   **Optional:**
   - `RESEND_API_KEY`: For password reset emails
   - `FROM_EMAIL`: Sender email address (e.g., `noreply@yourdomain.com`)
   - `APP_NAME`: Application name for emails (default: `PDF Scraper App`)
   - `CRON_SECRET`: For securing cron endpoints (generate with `openssl rand -hex 32`)
   - Stripe variables (see Stripe Integration section below)

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
2. **Forgot password?** Use `/forgot-password` to receive an OTP via email
3. **Dashboard** at `/` - view your account stats and recent resumes
4. **Upload a PDF** at `/upload` - drag and drop or click to select
5. **View results** at `/resumes` - see all your uploaded files
6. **View details** - click on any resume to see the extracted JSON data
7. **Manage subscription** at `/settings` - upgrade plans, manage billing, view credits

## Architecture

### PDF Extraction Method

This application uses an **intelligent PDF detection system** that automatically chooses the optimal extraction strategy:

#### 1. PDF Analysis & Type Detection
- **SimplePDFAnalyzer** analyzes PDF structure to detect content type:
  - `TEXT_BASED`: PDFs with extractable text (digital documents)
  - `IMAGE_BASED`: PDFs containing primarily images
  - `SCANNED`: Scanned documents requiring OCR
  - `MIXED`: Hybrid PDFs with both text and images
- Recommends extraction strategy: `text-extraction` or `image-extraction`

#### 2. Text-Based PDFs (Responses API)
For text-rich PDFs with extractable content:
- **Model**: `gpt-4o-mini` (cost-effective)
- **Process**:
  1. Upload PDF to OpenAI Files API (`purpose: user_data`)
  2. Call Responses API with `file_id` and extraction prompt
  3. Parse JSON output and validate with Zod
- **Advantages**: Fast, inexpensive, handles native text extraction

#### 3. Image-Based PDFs (Vision API)
For scanned documents or image-heavy PDFs:
- **Model**: `gpt-4o` with Vision capabilities
- **Process**:
  1. Convert PDF pages to PNG images
  2. Process each page through Vision API with base64-encoded images
  3. Merge responses from all pages
  4. Deduplicate and normalize data
- **Advantages**: Handles scanned resumes, images, and poor-quality text

### File Handling Strategy
- **Files >4MB**: Direct upload to Supabase Storage via signed URLs (bypasses Vercel's 4MB payload limit)
- **Multi-page support**: Vision pipeline processes up to 10 pages per PDF
- **Structured Output**: Both pipelines extract data into standardized JSON using Zod validation

### Data Flow
1. User uploads PDF → Supabase Storage
2. Client calls `/api/extract/responses` with `storagePath`
3. **Server analyzes PDF** → determines content type
4. **Text-based**: Upload to OpenAI Files API → Responses API extraction
5. **Image-based**: Convert to images → Vision API extraction (per page) → merge results
6. Validate JSON → store in database
7. Results displayed in UI

### Cost Considerations

OpenAI API costs vary by extraction method:

**Text-based PDFs (Responses API with gpt-4o-mini):**
- **Approximate cost**: $0.01-0.02 per resume
- Fast and cost-effective for digital resumes

**Image-based PDFs (Vision API with gpt-4o):**
- **Approximate cost**: $0.03-0.10 per resume (depending on page count)
- Higher cost due to image processing, but handles scanned documents

The app automatically chooses the most cost-effective method based on PDF content type.

### Limits

- **Maximum PDF size**: 10 MB (Supabase Storage upload limit)
- **Maximum pages for Vision API**: 10 pages (configurable in `lib/constants.ts`)
- **Vercel serverless function timeout**: 10 seconds (Hobby plan)
- **Processing time**: 
  - Text-based: 2-5 seconds per PDF
  - Image-based: 5-15 seconds (depending on page count)
- **Concurrent extractions**: Limited by Vercel's function concurrency

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS
- **Authentication**: NextAuth with Credentials provider
- **Database**: Supabase Postgres with Prisma ORM
- **File Storage**: Supabase Storage
- **AI Extraction**:
  - OpenAI Responses API with `gpt-4o-mini` (text-based PDFs)
  - OpenAI Vision API with `gpt-4o` (image-based PDFs)
  - Intelligent PDF type detection
- **PDF Processing**: `pdf-to-img` for PDF-to-image conversion
- **Email**: Resend for transactional emails
- **Payments**: Stripe for subscriptions (optional)
- **Validation**: Zod for schema validation
- **UI**: Sonner for toast notifications, shadcn/ui components
- **Deployment**: Vercel with Cron Jobs

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication pages (sign-in, sign-up, forgot-password)
│   ├── api/             # API routes
│   │   ├── auth/        # Authentication endpoints (register, login, password reset)
│   │   ├── cron/        # Scheduled cleanup tasks
│   │   ├── extract/     # PDF extraction endpoints
│   │   ├── resumes/     # Resume CRUD operations
│   │   ├── stripe/      # Stripe checkout and portal
│   │   └── webhooks/    # Stripe webhook handlers
│   ├── resumes/         # Resume management pages
│   ├── settings/        # User settings and subscription management
│   └── upload/          # PDF upload page
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   └── skeletons/       # Loading skeletons
├── docs/                # Documentation files
│   ├── DEPLOYMENT.md    # Vercel deployment guide
│   ├── RATE_LIMITING.md # Rate limiting documentation
│   └── CRON_JOBS.md     # Cron jobs documentation
├── lib/                 # Utilities and configurations
│   ├── services/        # Service layer (auth, email, storage, etc.)
│   └── middleware/      # Custom middleware
├── prisma/              # Database schema
├── vercel.json          # Vercel configuration (cron jobs)
└── env.example          # Environment variables template
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
- `customer.subscription.created` - Handles subscription creation
- `customer.subscription.updated` - Handles plan changes (upgrades/downgrades)
- `customer.subscription.deleted` - Deactivates subscription
- `invoice.payment_succeeded` - Adds credits for subscription renewals
- `customer.deleted` - Cleanup when customer is deleted from Stripe

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
- **Email service is optional** - password reset requires Resend configuration
- Database indexes optimized for common queries (resume listing, rate limiting)