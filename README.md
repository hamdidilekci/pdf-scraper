# pdf-scraper
Next.js application that allows users to upload and extract data from PDF files using OpenAI
# PDF Scraper App

This is a Next.js 14 App Router project with credentials-based authentication (NextAuth), Prisma connected to Supabase Postgres, and TailwindCSS.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

- Copy `env.sample` to `.env` and fill in placeholders.
  - `DATABASE_URL`: Supabase Postgres connection string
  - `NEXTAUTH_SECRET`: a strong random string
  - `NEXTAUTH_URL`: `http://localhost:3000` locally

3. Prisma setup:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Auth

- Sign up at `/sign-up` (writes user with `hashedPassword` via Prisma)
- Sign in at `/sign-in` (NextAuth Credentials)
- All routes are protected by default via `middleware.ts`, except `/sign-in`, `/sign-up`, and Next.js static routes.

## Tech

- Next.js 14 App Router (TypeScript)
- NextAuth (Credentials, JWT sessions)
- Prisma + Supabase Postgres
- TailwindCSS

## Notes

- We use Supabase strictly as Postgres; NextAuth handles auth.
- Passwords are hashed with bcrypt (min length 8).