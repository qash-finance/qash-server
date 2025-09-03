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
2. Make sure to install all dependencies by running `npm install`
3. Run `cp .env.example .env`
4. Before spinning up a local database, make sure you don't have a running container with the same port that will be used by server, these ports are `6500`, `5050` and `3001`
5. Make sure you have docker installed and running, then run `npm run docker:db:up`, it will spin up a local database
6. Finally, run `npm run start:dev` to start the dev server
7. Visit `http://localhost:3001/api-v1` to view a list of available endpoints

# Running the app

```bash
# development, make sure you have a local database running
npm run start:dev

# production mode
npm run start:prod
```

# [Development] Starting a local database

```bash
npm run docker:db:up
```

# [Development] Stopping a local database

```bash
npm run docker:db:down
```

# [Development] Prisma Database Management

This project uses Prisma as the primary database ORM. Here are the key Prisma commands:

## Prisma CLI Commands

```bash
# Generate Prisma client from schema
npm run prisma:generate --schema ./src/database/prisma/schema.prisma

# Deploy migrations to database
npm run prisma:deploy --schema ./src/database/prisma/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema ./src/database/prisma/schema.prisma

# Reset database (⚠️ destructive - drops all data)
npx prisma db push --force-reset --schema ./src/database/prisma/schema.prisma

# Push schema changes directly to database (for development)
npx prisma db push --schema ./src/database/prisma/schema.prisma

# Pull database schema into Prisma schema
npx prisma db pull --schema ./src/database/prisma/schema.prisma

# Validate Prisma schema
npx prisma validate --schema ./src/database/prisma/schema.prisma

# Format Prisma schema file
npx prisma format --schema ./src/database/prisma/schema.prisma
```

## Prisma Workflow

### 1. Schema Changes

Edit `src/prisma/schema.prisma` to modify your database models, then:

```bash
# Generate migration file
npm run prisma:migrate:dev
```

### 2. After Schema Changes

```bash
# Generate updated Prisma client
npm run prisma:generate --schema ./src/database/prisma/schema.prisma

# Deploy migrations to production
npm run prisma:deploy --schema ./src/database/prisma/schema.prisma
```

### 3. Database Seeding

```bash
# Run seed script (if configured)
npx prisma db seed --schema ./src/database/prisma/schema.prisma

# Reset and seed database
npx prisma migrate reset --schema ./src/database/prisma/schema.prisma
```

## Environment Variables

Make sure your `.env` files include:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

## Prisma Studio

Access your database through a web interface:

```bash
npx prisma studio
```

This opens a browser at `http://localhost:5555` where you can view and edit your data.

# [Testing] Running tests

```bash
# unit tests
npm run test

# test coverage
npm run test:cov
```

# [Production] Linter

```bash
npm run format
```
