import * as Joi from 'joi';
import { DEFAULT_TRUST_PROXY } from './trust-proxy.config';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  TRUST_PROXY: Joi.string().allow('').default(DEFAULT_TRUST_PROXY),
  API_PREFIX: Joi.string().min(1).required(),

  DB_STORAGE: Joi.string().min(1).required(),
  CONTROL_DB_STORAGE: Joi.string().min(1).required(),
  DB_LOGGING: Joi.string().valid('true', 'false').default('false'),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().min(1).required(),

  CORTES_MANIFEST_HMAC_SECRET: Joi.string().min(16).required(),
  CORTES_MAX_UPLOAD_MB: Joi.number().positive().default(100),
  CORTES_UPLOAD_RATE_LIMIT: Joi.number().positive().default(5),
  INE_AJUSTE_ESPERADAS_DIP: Joi.number().integer().default(0),
  INE_AJUSTE_ESPERADAS_ALC: Joi.number().integer().default(0),

  SWAGGER_TITLE: Joi.string().min(1).required(),
  SWAGGER_DESCRIPTION: Joi.string().allow('').default(''),
  SWAGGER_VERSION: Joi.string().min(1).required(),
  SWAGGER_PATH: Joi.string().min(1).required(),

  CORS_ORIGINS: Joi.string().allow('').required(),

  APP_VERSION: Joi.string().min(1).default('unknown'),
  GIT_COMMIT_BACKEND: Joi.string().min(1).default('unknown'),
  GIT_COMMIT_FRONTEND: Joi.string().min(1).default('unknown'),
  BUILD_DATE: Joi.string().min(1).default('unknown'),
  IMAGE_DIGEST: Joi.string().min(1).default('unknown'),
});
