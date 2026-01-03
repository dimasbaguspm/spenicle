# Spenicle

Personal finance management system with multiple clients (web, CLI) and a unified backend API.

## Repository Structure

This is a monorepo containing three main applications:

```
spenicle/
├── apps/
│   ├── backend/     # Go REST API server
│   ├── web/         # Web frontend application
│   └── cli/         # Command-line interface
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

### Web (`apps/web/`)

Web-based frontend for Spenicle (in development).

**Status:** In Development

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

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI assistant guidelines when working with this codebase.

## Project Status

- ✅ **Backend:** MVP complete with core features
- 🚧 **Web:** In development
- 🚧 **CLI:** In development
- 🚧 **E2E Tests:** In development

## License

MIT

## Contact

@dimasbaguspm
