# Miden server implementation 

This server implementation serves as a Q3x (The end-to-end privacy-first programmable asset management platform) that uses the following tech stack:

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
    git clone https://github.com/Quantum3-Labs/server-base.git
    cd server-base
   ```
2. Make sure to install all dependencies by running `npm install`
3. Make sure to set environment variable `NODE_ENV` whenever you open a new terminal by running `export NODE_ENV=development`, three options for `NODE_ENV`(development, production, test), this will decide which .env file to use, .env.development, .env.production or .env.test
4. Copy the `.env.example`, according to the mode, you need to run `cp .env.example .env.development`, `cp .env.example .env.production` or `cp .env.example .env.test`
5. Before spinning up a local database, make sure you don't have a running container with the same port that will be used by server base, these ports are `6500`, `5050` and `3001`, if you have either one of the ports in used, you can check [this section](#how-to-use-custom-port-for-server-base)
6. Make sure you have docker installed and running, then run `npm run docker:db:up`, it will spin up a local database
7. Finally, run `npm run start:dev` to start the dev server
8. Visit `http://localhost:3001/api-v1` to view a list of available endpoints

# Env file for different environment
```bash
# production
cp .env.example .env.production

# development
cp .env.example .env.development

# test
cp .env.example .env.test
```

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

# [Development] Migrations (Creating tables in database)

```bash
# create migration
npm run migration:create

# geneate migration from entities
npm run migration:generate

# run migrations
npm run migration:run
```

# [Development] Prisma Database Management

This project uses Prisma as the primary database ORM. Here are the key Prisma commands:

## Prisma CLI Commands

```bash
# Generate Prisma client from schema
npm run prisma:generate

# Deploy migrations to database
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (⚠️ destructive - drops all data)
npx prisma db push --force-reset

# Push schema changes directly to database (for development)
npx prisma db push

# Pull database schema into Prisma schema
npx prisma db pull

# Validate Prisma schema
npx prisma validate

# Format Prisma schema file
npx prisma format
```

## Prisma Workflow

### 1. Schema Changes
Edit `prisma/schema.prisma` to modify your database models, then:

```bash
# Generate migration file
npx prisma migrate dev --name descriptive_name

# Or push changes directly (development only)
npx prisma db push
```

### 2. After Schema Changes
```bash
# Generate updated Prisma client
npm run prisma:generate

# Deploy migrations to production
npm run prisma:deploy
```

### 3. Database Seeding
```bash
# Run seed script (if configured)
npx prisma db seed

# Reset and seed database
npx prisma migrate reset
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

# e2e tests
# before running the test, make sure to run `npm run docker:db:down` to clear the db, because the test will use the same db as the local db
NODE_ENV=test npm run test:e2e
```

# [Production] Linter

```bash
npm run format
```
