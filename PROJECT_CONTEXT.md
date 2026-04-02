# Nexus Project Context

This document explains the current backend project so new contributors (and AI assistants) can quickly understand how it works and add features safely.

## What This Project Is

- Backend API built with NestJS (TypeScript)
- Authentication with JWT (`signup`, `login`, `logout`)
- User management APIs (CRUD + list/search/filter)
- PostgreSQL for persistent user data (TypeORM)
- Redis client integration for caching/session/pub-sub extensions

## Tech Stack

- Framework: `@nestjs/common`, `@nestjs/core`
- Auth: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`
- Database: `@nestjs/typeorm`, `typeorm`, `pg`
- Cache/infra: `redis` (node-redis client)
- Validation: `class-validator`, `class-transformer`

## High-Level Module Layout

- `src/app.module.ts`: root module and infrastructure wiring
- `src/module/auth/*`: auth controllers/services/guard/strategy/dtos
- `src/module/users/*`: user controllers/services/entity/dtos/types
- `src/redis/*`: redis module and redis service
- `src/chat.gateway.ts`: websocket gateway

## Current Architecture

### App Bootstrap

- `ConfigModule` is global (`ConfigModule.forRoot({ isGlobal: true })`)
- `TypeOrmModule.forRoot(...)` uses env vars:
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `RedisModule` is imported globally for redis access
- In development, DB schema sync is enabled via:
  - `synchronize: process.env.NODE_ENV !== 'production'`

### Auth Flow

- Signup/Login issue JWT access token
- JWT payload includes user identity and role
- Protected routes use `JwtAuthGuard`
- `logout` revokes the current token (in-memory revoked token map)

### Users Flow

- `User` entity stored in PostgreSQL table `users`
- `UserService` uses TypeORM repository (no in-memory array)
- List API supports:
  - pagination (`page`, `limit`)
  - text search (`search` on name/email)
  - filters (`role`, `isActive`)

## API Endpoints

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout` (requires Bearer token)

### Users (JWT required)

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

## Environment Variables

Use `.env` with at least:

- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- Optional redis:
  - `REDIS_URL` (preferred), or
  - `REDIS_HOST` + `REDIS_PORT`

## Local Dev Setup

1. Install dependencies:
   - `npm install`
2. Start local services:
   - `docker compose up -d postgres redis`
3. Ensure `.env` has correct DB/JWT/Redis values
4. Run app:
   - `npm run start:dev`

## Conventions to Follow for New Features

- Put feature code under `src/module/<feature>/`
- Split by:
  - `controller` for HTTP layer
  - `service` for business logic
  - `dto` for input validation
  - `entity` for DB schema
- Protect private routes with `JwtAuthGuard`
- Validate all request payloads with DTO decorators
- Never expose `passwordHash` in API responses
- Reuse `ConfigModule` env-based configuration (avoid hardcoded secrets)

## How to Add a New Feature (Recommended Pattern)

1. Create `module`, `controller`, `service`, `dto`, `entity`
2. Register entity using `TypeOrmModule.forFeature([Entity])`
3. Wire module in `app.module.ts` (if not imported by another module)
4. Add guards for protected routes
5. Add request validation with DTOs
6. Run verification:
   - `npm run build`
   - `npm run test`

## Known Gaps / Next Improvements

- Replace in-memory logout revocation with Redis-backed token blacklist
- Add role-based authorization (admin-only endpoints where needed)
- Add Swagger/OpenAPI docs
- Add migrations for production-safe DB evolution (`synchronize` off in prod)
- Add e2e coverage for auth + users flows

## Notes for AI Assistants

When proposing or implementing changes:

- Keep module boundaries clean (`auth`, `users`, `redis`, etc.)
- Prefer incremental, minimal edits over broad refactors
- Maintain DTO validation and guard usage
- Keep response shapes backward-compatible unless explicitly requested
- Update this file when architecture or workflows change
