This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database & Prisma

This project now targets PostgreSQL and uses [Prisma Accelerate](https://www.prisma.io/accelerate) for pooled connections. Provide the following environment variables before running any Prisma or Next.js command:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=1"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
PRISMA_ACCELERATE_URL="https://accelerate.prisma-data.net/..."
```

- `PRISMA_ACCELERATE_URL` enables Accelerate. When this value is present the application automatically routes Prisma traffic through Accelerate (even when running in a Node.js runtime). When it is omitted, the app falls back to a direct database connection.
- `DIRECT_DATABASE_URL` is used for migrations and seeding to ensure schema changes bypass the Accelerate proxy.

### Prisma commands

- Generate client: `npx prisma generate`
- Apply schema to a fresh database: `npx prisma migrate deploy`
- Reset development database: `npx prisma migrate reset`
