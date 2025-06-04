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
  

### File Naming Conventions
- Use kebab-case for file names (e.g., `my-component.tsx` or `user-service.ts`)

### Concepts and Patterns
- Make the code modular and reusable and future proof
- Use functional programming principles where applicable
- Use TypeScript for type safety and better developer experience
- Keep the code DRY (Don't Repeat Yourself)
- Use async/await for asynchronous code
- Use Promises for handling asynchronous operations
- Use environment variables for configuration (see `shell.nix` for example)

### Code Quality
- Write clean, readable, and maintainable code
- When creating a function, the maximum number of parameters should be 2. If more parameters are needed, consider using an object to encapsulate them
- Use TypeScript interfaces or types to define the shape of objects
- Use `const` for variables that are not reassigned and `let` for those that are
- Use arrow functions for anonymous functions
- Use template literals for string interpolation
- Use destructuring for objects and arrays where appropriate
- Always include comments where necessary (without over-commenting)
- Use descriptive variable and function names
- Use consistent coding style and formatting

### Before Submitting Code
- Ensure the dependencies version is using the same version as the `package.json` file (near the top of the file)