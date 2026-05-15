# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm/Turbo monorepo. Application code lives under `apps/`: `apps/frontend` is a Next.js 15 React app, and `apps/backend` is a NestJS API with Prisma. Shared TypeScript exports live in `packages/shared/src`. Frontend routes are in `apps/frontend/src/app`, reusable UI in `apps/frontend/src/components`, and API clients/hooks/stores in `apps/frontend/src/lib`. Backend feature modules are grouped under `apps/backend/src/<feature>` with DTOs in local `dto` folders. Prisma schema and migrations are in `apps/backend/prisma`. Infrastructure code is in `infra/`, and operational docs are in `docs/`.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`.

- `pnpm dev`: run all app dev tasks through Turbo.
- `pnpm build`: build packages and apps.
- `pnpm test`: run unit/component tests across the monorepo.
- `pnpm test:e2e`: run end-to-end tests.
- `pnpm lint`: run ESLint tasks.
- `pnpm type-check`: run TypeScript checks.
- `pnpm format` / `pnpm format:check`: write or verify Prettier formatting.

Target a package with filters, for example `pnpm --filter @yueeroom/frontend test:watch` or `pnpm --filter @yueeroom/backend prisma:migrate`.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, semicolons, single quotes, trailing commas, and a 100-column print width. ESLint rejects unused variables except names prefixed with `_`, and rejects `any`. Use type-only imports in frontend and shared code; keep runtime imports in backend NestJS dependency injection. Name React components and Nest classes in `PascalCase`, functions and variables in `camelCase`, and route/module folders in lowercase or kebab-case.

## Testing Guidelines

Frontend tests use Vitest and Testing Library with `*.test.ts` or `*.test.tsx` files colocated near source; Playwright specs live in `apps/frontend/e2e`. Backend tests use Jest with `*.spec.ts` files beside services, controllers, and guards. Add or update tests for behavior changes, especially API clients, hooks, services, guards, and payment/order flows. Run the narrow package test first, then `pnpm test` before broad changes.

## Commit & Pull Request Guidelines

Recent history uses short Conventional Commit-style prefixes such as `fix(products): ...`, `refactor(products): ...`, and `chore: ...`; follow that pattern and keep scopes meaningful. Pull requests should describe the change, list verification commands, link issues when available, and include screenshots for visible frontend changes. Call out migrations, Terraform changes, or new environment variables.

## Security & Configuration Tips

Do not commit secrets or local `.env` files. Use `apps/backend/prisma` commands for schema changes, and review generated migrations before committing. For infrastructure work, start from examples such as `infra/terraform/terraform.tfvars.example` and document any required cloud or CI configuration changes.
