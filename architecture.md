# Spenicle — Architecture & Project Overview

This file contains the full project overview and architecture information. It was moved from the original `readme.md` to keep the root README focused on usage for end users.

## Repository Structure

This is a monorepo containing three main applications:

```
spenicle/
├── apps/
│   ├── backend/     # Go REST API server
│   ├── backend-bdd/ # Backend E2E tests (Playwright)
│   ├── web/         # Web frontend application
+│   └── cli/         # Command-line interface
├── e2e/             # End-to-end tests (mirrors apps/ structure)
├── .github/         # GitHub Actions, Copilot instructions
└── scripts/         # Build and deployment scripts
```

## Applications

### Backend (`apps/backend/`)

Go-based REST API server providing financial management capabilities.

**Key Features:**

- Account management (expense, income, investment tracking)
- Transaction management with categories and tags
- Budget tracking and templates
- Transaction relations (splits, recurring)
- Summary and trend analysis
- JWT authentication

**Documentation:** See `apps/backend/docs/` for detailed guides

### Backend E2E Tests (`apps/backend-bdd/`)

Comprehensive E2E API tests using Playwright with isolated Docker environment.

**Key Features:**

- Type-safe tests with OpenAPI-generated types
- Global authentication (single login for all tests)
- Isolated Docker environment (separate PostgreSQL + backend)
- Custom fixtures for clean, reusable test code
- Automatic type generation from backend schemas

**Tech Stack:**

- Playwright for API testing
- TypeScript with strict mode
- openapi-typescript for type generation
- Docker Compose for isolated environment

### Web (`apps/web/`)

React-based web frontend for Spenicle.

**Tech Stack:**

- React 19 + TypeScript + Bun
- React Router v7 with multi-layer routing (Page/Drawer/Modal/Bottom Sheet)
- TanStack Query for API integration
- Tailwind CSS + shadcn/ui
- OpenAPI-generated types

**Key Features:**

- Multi-layer routing system (4 independent navigation layers)
- Context-based state management (Providers)
- Session management (sessionStorage + localStorage)
- Dynamic floating action buttons
- Type-safe API integration with generated types

### CLI (`apps/cli/`)

Command-line interface for Spenicle (in development).

**Status:** In Development

## Development

### Repository Layout

Each application under `apps/` is self-contained with its own:

- Dependencies and package management
- Documentation (`docs/` directory)
- Tests (unit, integration)
- Build configuration

### Working on Multiple Apps

While each app can be developed independently, they share:

- Root-level configuration (`.github/`)
- E2E test infrastructure (`e2e/`)
- Common deployment scripts (`scripts/`)

### GitHub Copilot

See `.github/copilot-instructions.md` for AI assistant guidelines when working with this codebase.

## Project Status

- ✅ **Backend:** MVP complete with core features
- 🚀 **Web:** Active development
- 🚧 **CLI:** In development
- ✅ **Backend E2E Tests:** Complete

## License

MIT

## Contact

@dimasbaguspm
