# GitHub Instructions

### Commit Message Format

Each commit message should follow this format:

```
<type>(<scope>): <subject>
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
  - `spike`: Experimental changes or spikes

- **scope**: The part of the codebase affected (required)
  - Examples: auth, user, api, db, web, etc.

- **subject**: A short description of the change (required)
  - Use the imperative, present tense (e.g., "change" not "changed" or "changes")
  - Don't capitalize the first letter
  - No period (.) at the end
  - Add exclamation mark (!) if the change is a breaking change
  

### Examples

```
feat(auth): add JWT refresh token functionality
```
