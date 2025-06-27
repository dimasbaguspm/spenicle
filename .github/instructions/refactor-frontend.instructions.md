# Spenicle Component Standards - Refactor-Ready Development

## Directory Pattern Checklist

- [ ] Each component folder contains the main component file, an `index.ts` barrel file, and related files (`components/`, `types.ts`, `helpers.ts`)
- [ ] Subcomponents are placed in a `components/` subfolder within their parent component's directory
- [ ] Subcomponents follow kebab-case naming with parent prefix (e.g., `input-field/components/input-field-helper-message.tsx`)
- [ ] Subcomponents are not exported directly from the parent component's `index.ts` file
- [ ] Component names use PascalCase with parent prefix (e.g., `InputFieldHelperMessage` for `InputField` parent)
- [ ] No circular dependencies between components, subcomponents, and helpers
- [ ] `types.ts` file contains only types/interfaces related to the component and its subcomponents
- [ ] `helpers.ts` file contains utility functions specific to the component and its subcomponents
- [ ] `index.ts` file exports only the main component and types from `types.ts`
- [ ] Component files use `.tsx` extension, helpers and types use `.ts` extension

## General Coding Standards Checklist

- [ ] Add inline comments with straightforward explanations (lowercase, no dots)
- [ ] Follow DRY principles and keep code simple
- [ ] Implement strict TypeScript typing with explicit interfaces
- [ ] Use ESLint rules defined in nearest `package.json`
- [ ] Follow modular, reusable, and future-proof design patterns

### Naming Conventions
- [ ] Files and directories use kebab-case (`user-profile.component.tsx`)
- [ ] React components use PascalCase (`UserProfile`)
- [ ] Functions and variables use camelCase (`getUserData`)
- [ ] Constants use SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- [ ] Types and interfaces use PascalCase with descriptive suffixes (`UserProfileProps`, `UserProfileState`)
- [ ] Event handlers use "handle" prefix (`handleSubmit`, `handleInputChange`)

### Function Standards
- [ ] Functions have single responsibility and clear purpose
- [ ] Maximum 2 direct parameters per function
- [ ] Use options object pattern for 3+ parameters
- [ ] Prefer `async/await` over promise chains
- [ ] Write pure functions for utility operations
- [ ] Use named constants instead of magic numbers or strings
- [ ] Include TypeScript return type annotations for clarity

## Component Patterns Checklist

### Component Architecture (Compound Patterns)
- [ ] Use compound component pattern with subcomponents attached to main component (e.g., `Form.Field`, `Modal.Header`)
- [ ] Type all components using `React.FC` with explicit prop interfaces
- [ ] Implement `React.Context` for internal component communication when required
- [ ] Follow semantic HTML elements and ARIA attributes for accessibility compliance
- [ ] Apply atomic design principles (atoms, molecules, organisms)
- [ ] Ensure single responsibility per component
- [ ] Define clear props interface with comprehensive TypeScript typing
- [ ] Avoid prop drilling beyond 2 component levels
- [ ] Establish clear API boundaries between component layers
- [ ] Implement proper error boundaries for component isolation
- [ ] Use composition over inheritance patterns
- [ ] Implement proper component lifecycle management

## Styling Approach Checklist (Tailwind + CVA)

### Class Variance Authority (CVA)
- [ ] Use CVA for all component variant management and style composition
- [ ] Implement consistent variant naming across component library
- [ ] Integrate TypeScript with `VariantProps` for type safety
- [ ] Define base styles and variant combinations clearly
- [ ] Use compound variants for complex style interactions

### Design System Integration
- [ ] Define design tokens using CSS custom properties
- [ ] Follow consistent spacing scale (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`)
- [ ] Avoid hardcoded values - use design system tokens exclusively
- [ ] Implement consistent color palette and typography scales
- [ ] Use semantic color naming (`primary`, `secondary`, `danger`, `success`)

### Component Styling Standards
- [ ] Use `cn()` utility function for conditional class composition
- [ ] Compose styles through CVA variants rather than conditional logic
- [ ] Avoid inline styles - use Tailwind classes exclusively
- [ ] Implement responsive design using Tailwind breakpoint prefixes
- [ ] Use CSS logical properties for better internationalization support
- [ ] Implement focus management and keyboard navigation styles
- [ ] Follow WCAG color contrast requirements for accessibility

## Documentation Standards Checklist

### Component Documentation
- [ ] Include JSDoc comments for all exported components
- [ ] Document all props with types and descriptions

## Security and Best Practices Checklist

### Accessibility Standards
- [ ] Include proper ARIA labels and descriptions
- [ ] Ensure keyboard navigation works for all interactive elements
- [ ] Maintain proper focus management and focus indicators
- [ ] Use semantic HTML elements appropriately
- [ ] Test with screen readers and accessibility tools
- [ ] Follow WCAG 2.1 AA compliance standards
- [ ] Provide alternative text for images and visual elements

---

*These standards ensure consistent, maintainable, and secure frontend component development following modern React and TypeScript best practices.*