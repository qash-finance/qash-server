import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
console.log(
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}?schema=${process.env.POSTGRES_SCHEMA}`,
);
export default defineConfig({
  datasource: {
    url: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}?schema=${process.env.POSTGRES_SCHEMA}`,
  },
});
