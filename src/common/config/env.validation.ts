import * as Joi from 'joi';

export const envValidator = Joi.object({
  // General
  NODE_ENV: Joi.string().default('development'),
  HOST: Joi.string().default('localhost'),
  PORT: Joi.string().default(3001),
  SESSION_SECRET: Joi.string().default('session_key'),
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_PORT: Joi.string().required(),

  // @important, default value
  // Auth
  JWT_SECRET: Joi.string().default('jwt_secret'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('1000000000000000'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('1000000000000000'),
});
