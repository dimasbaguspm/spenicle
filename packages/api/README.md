# spendless-api

A REST API for the Spendless application.

## Development

### Prerequisites

- Node.js 22 or later
- Yarn package manager (v4.6.0 or later)

### Setup

1. Clone the repository
2. Install dependencies:
```bash
yarn install
```

### Available Commands

- `yarn dev`: Start the development server with hot reload
- `yarn build`: Build the project for production
- `yarn start`: Start the production server
- `yarn test`: Run tests
- `yarn lint`: Lint the code
- `yarn check`: Type check the code

## API Documentation

### Swagger UI

Interactive API documentation is available via Swagger UI when the server is running:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI Spec (JSON)**: http://localhost:3000/api/docs/swagger.json

The Swagger documentation includes:
- Complete API endpoint documentation
- Request/response schemas
- Authentication requirements
- Interactive testing interface
- Example requests and responses

### Authentication

Most endpoints require authentication using JWT Bearer tokens. To use protected endpoints in Swagger UI:

1. Register a new user or login via the `/auth/register` or `/auth/login` endpoints
2. Copy the `accessToken` from the response
3. Click the "Authorize" button in Swagger UI
4. Enter `Bearer <your-access-token>` in the authorization field
5. Click "Authorize" to apply the token to all requests

### Available Endpoints

- **Authentication**: `/api/auth/*` - User registration and login
- **Health Check**: `/api/health` - Service health status
- **Accounts**: `/api/accounts/*` - Account management
- **Categories**: `/api/categories/*` - Category management
- **Transactions**: `/api/transactions/*` - Transaction management
- **Groups**: `/api/groups/*` - Group management
- **Users**: `/api/users/*` - User management
- **Summary**: `/api/summary/*` - Financial summaries and reports

## Release Process and Changelog Management

This project uses [standard-version](https://github.com/conventional-changelog/standard-version) to automate versioning and changelog generation.

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature (increments the minor version)
- `fix:` - A bug fix (increments the patch version)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks

### Creating a New Release

Releases can be created locally with one of the following commands:

```bash
# Automatically determine version bump based on commit messages
yarn release

# Specify version bump explicitly
yarn release:patch # 1.0.0 -> 1.0.1
yarn release:minor # 1.0.0 -> 1.1.0
yarn release:major # 1.0.0 -> 2.0.0

# Create a pre-release
yarn release:alpha # 1.0.0 -> 1.0.1-alpha.0
yarn release:beta  # 1.0.0 -> 1.0.1-beta.0
```

Alternatively, a GitHub workflow can be triggered manually from the Actions tab to create a release.

Each release will:
1. Bump the version in package.json
2. Update the CHANGELOG.md file with all changes since the last release
3. Create a git tag
4. Create a GitHub release with the changelog content
