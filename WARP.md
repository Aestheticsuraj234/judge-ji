# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Judge-Ji is a code execution and judging system built with Express, TypeScript, and Prisma. It manages code submissions, executes them, and tracks their status through a PostgreSQL database.

## Common Commands

### Development
```bash
npm run dev           # Start development server with hot reload (includes Docker Compose for DB)
```

### Database Management
```bash
npm run db:push       # Push Prisma schema changes to database
npm run generate      # Generate Prisma Client from schema
```

### Build & Production
```bash
npm run build         # Compile TypeScript to dist/
npm start            # Run production build from dist/
```

### Docker
```bash
docker-compose up -d  # Start PostgreSQL database (port 5435)
docker-compose down   # Stop database
```

## Architecture

### Database Layer (Prisma)
- **Schema Location**: `prisma/schema.prisma`
- **Database**: PostgreSQL running on port 5435 (Docker)
- **Connection**: Requires `DATABASE_URL` in `.env` file

**Core Models**:
- `Submission`: Tracks code submissions with source code, language, execution results, timing info, and status
- `Language`: Defines supported languages with compilation/execution commands
- `Status`: Enumeration table for submission lifecycle states

**Key Relationships**:
- Submission → Language (many-to-one)
- Submission → Status (many-to-one)

### Application Layer
- **Entry Point**: `src/server.ts` - Express server with Prisma client
- **Database Client**: `src/lib/db.ts` - Singleton Prisma client with development mode caching

### TypeScript Configuration
- **Path Aliases**: Configured in `tsconfig.json`
  - `@/*` → `src/*`
  - `@controllers/*`, `@models/*`, `@routes/*`, `@middleware/*`, `@utils/*`
- **Build Output**: `dist/` directory (excluded from git)
- **Module System**: CommonJS

## Important Notes

### Database Connection
The PostgreSQL database runs on **port 5435** (not the default 5432) to avoid conflicts. Ensure your `.env` file has:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/postgres"
```

### Prisma Workflow
When modifying the database schema:
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes
3. Run `npm run generate` to update Prisma Client types

### Development Dependencies
The project uses `ts-node-dev` for development hot reloading with `--transpile-only` flag for faster compilation (type checking happens separately).

## Code Execution Architecture (Planned)

Based on the Submission model structure, this system is designed to:
1. Accept code submissions via API with source code, language, and optional stdin/expected output
2. Queue submissions for execution (`queued_at`, `queue_host`)
3. Execute code in isolated environments (`started_at`, `execution_host`)
4. Capture execution results (stdout, stderr, exit codes, timing, memory usage)
5. Compare outputs against expected results
6. Support callbacks via `callback_url` for async notification
