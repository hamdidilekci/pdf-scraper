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

### File Handling Strategy
- **Files >4MB**: Direct upload to Supabase Storage via signed URLs (bypasses Vercel's 4MB payload limit)
- **Text Extraction**: Currently uses placeholder text (PDF parsing libraries had webpack compatibility issues)
- **Production**: Would use cloud PDF services (Adobe PDF Services, AWS Textract, or Google Document AI)

### Data Flow
1. User uploads PDF → Supabase Storage
2. Server processes PDF → OpenAI extraction
3. Structured JSON → Database storage
4. Results displayed in UI

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS
- **Authentication**: NextAuth with Credentials provider
- **Database**: Supabase Postgres with Prisma ORM
- **File Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o-mini for text extraction
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

## Development Notes

- All routes are protected by default via `middleware.ts`
- Passwords are hashed with bcrypt (minimum 8 characters)
- Uses Supabase for both database and file storage
- OpenAI integration with structured JSON output
- Comprehensive error handling and user feedback