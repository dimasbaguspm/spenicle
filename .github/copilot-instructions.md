# GitHub Instructions

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, which helps with automated versioning and changelog generation. Our commit messages are validated using commitlint with the `@commitlint/config-conventional` configuration.

### Commit Message Format

Each commit message should follow this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Where:

- **type**: Describes the kind of change (required)
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation changes
  - `style`: Changes that don't affect the code's meaning (formatting, etc.)
  - `refactor`: Code changes that neither fix a bug nor add a feature
  - `perf`: Performance improvements
  - `test`: Adding or fixing tests
  - `build`: Changes to build system or dependencies
  - `ci`: Changes to CI configuration
  - `chore`: Other changes that don't modify src or test files
  - `revert`: Reverts a previous commit

- **scope**: The part of the codebase affected (optional)
  - Examples: auth, user, api, db, etc.

- **subject**: A short description of the change (required)
  - Use the imperative, present tense (e.g., "change" not "changed" or "changes")
  - Don't capitalize the first letter
  - No period (.) at the end

- **body**: Detailed description of the change (optional)
  - Can be multi-line
  - Use the imperative, present tense
  - Explain the "what" and "why" of the change, not the "how"

- **footer**: Information about breaking changes or referencing issues (optional)
  - Reference issues being closed with `Closes #123`
  - Breaking changes should start with `BREAKING CHANGE:`

### Examples

```
feat(auth): add JWT refresh token functionality
```

```
fix(api): resolve rate limiting issue

The rate limiting was not correctly handling multiple requests from the same IP.

Closes #123
```

```
docs: update API documentation
```

```
feat(user): implement password reset

- Add password reset endpoint
- Send reset email functionality
- Add token validation

BREAKING CHANGE: User model now requires email verification before password reset
```

### Using VS Code

When committing through VS Code:

1. Write your commit message following the conventional commit format
2. The commit-msg hook will automatically validate your commit message
3. If your commit message doesn't follow the convention, the commit will be rejected with an error message showing what needs to be fixed

### Special Notes

- **Line Length**: Unlike standard conventional commit rules, this project has disabled line length limits for both body and footer sections of commit messages. This allows for more detailed explanations when necessary.
- **Prerelease Tags**: Use the npm scripts to create alpha or beta releases:
  ```
  yarn release:alpha   # for alpha releases
  yarn release:beta    # for beta releases
  ```

### Automated Versioning

Proper commit messages enable our automated versioning system:
- `fix` commits trigger patch releases (1.0.0 → 1.0.1)
- `feat` commits trigger minor releases (1.0.0 → 1.1.0)
- `BREAKING CHANGE` in the footer triggers major releases (1.0.0 → 2.0.0)

Following these guidelines ensures consistent commit history and enables automatic versioning and changelog generation.
