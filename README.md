# Miden server implementation

This server implementation serves as a Qash (The end-to-end private crypto payroll management platform) that uses the following tech stack:

- [NestJS](https://nestjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/) (Database ORM)

# Requirements

Before you begin, you need to install the following tools:

- [Node (v18.18.1)](https://nodejs.org/en/download/package-manager)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

# Getting Started

1. Clone the repository:
   ```sh
    git clone https://github.com/q3x-finance/qash-ui.git
    cd qash-ui
   ```
2. Make sure to install all dependencies by running `pnpm install`
3. Run `cp .env.example .env`
4. Before spinning up a local database, make sure you don't have a running container with the same port that will be used by server, these ports are `6500`, `5050` and `3001`
5. Make sure you have docker installed and running, then run `pnpm run docker:db:up`, it will spin up a local database
6. Finally, run `pnpm run start:dev` to start the dev server
7. Visit `http://localhost:3001/api-v1` to view a list of available endpoints

## Environment Variables

Make sure your `.env` files include:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

# Running the app

```bash
# development, make sure you have a local database running
pnpm run start:dev

# production mode
pnpm run start:prod
```

# [Development] Starting a local database

```bash
pnpm run docker:db:up
```

# [Development] Stopping a local database

```bash
pnpm run docker:db:down
```

# [Development] Database Management

## Complete Database Reset & Migration Process

Follow these steps to completely reset your database and apply fresh migrations:

### Step 1: Stop the Application

```bash
# Stop your development server if running
# Press Ctrl+C in the terminal where the server is running
```

### Step 2: Drop the Database

```bash
pnpm run docker:db:down
```

### Step 3: Generate Prisma Client

```bash
# Generate the updated Prisma client
pnpm run prisma:generate
```

### Step 4: Start Fresh Database

```bash
# Start a new database container
pnpm run docker:db:up
```

### Step 5: Apply Migrations

```bash
# Deploy all migrations to the fresh database
pnpm run prisma:migrate:deploy
```

### Step 6: Verify Setup

```bash
# Start your development server
pnpm run start:dev
```

## Making Schema Changes

### 1. Edit Schema

Edit `src/database/prisma/schema.prisma` to modify your database models.

### 2. Generate Migration

```bash
# Generate migration file
pnpm run prisma:migrate:dev --schema ./src/database/prisma/schema.prisma
```

### 3. Update Prisma Client

```bash
# Generate updated Prisma client
pnpm run prisma:generate --schema ./src/database/prisma/schema.prisma
```

## Important Notes

⚠️ **Environment Configuration**:

- Prisma uses the `.env` file for database configuration
- **DO NOT** use `.env.development` for Prisma - it will not be recognized
- Always ensure your `.env` file contains the correct `DATABASE_URL`

⚠️ **Schema Path**:

- All Prisma commands must include `--schema ./src/database/prisma/schema.prisma`
- This is required due to our project structure

# [Development] Prisma Studio

Access your database through a web interface:

```bash
pnpm run prisma:studio
```

# [Testing] Running tests

```bash
# unit tests
pnpm run test

# test coverage
pnpm run test:cov
```

# [Production] Linter

```bash
pnpm run format
```
