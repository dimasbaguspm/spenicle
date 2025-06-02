---
applyTo: 'packages/web/**/*.{ts|tsx|js|jsx|json}'
---
This app is built with React and TypeScript, and builds on top of libraries like Tanstack Query, Tanstack Router, and Tailwind CSS v4.

There are a color palette and a set of design tokens that should be used consistently across the application (COLOR_PALETTE.md)

## Coding Standards
- src/libs/**, should contain libraries/utils that specified to the application and can be reused globally
- src/components/**, should contain reusable components across the application and not allowed to use global components
- src/hooks/**, should contain reusable hooks, and not allowed to use global components
- src/providers/**, should contain context providers that able to use global components and hooks 
- src/routes/**, should contain the routes of the application
- src/modules/**/**/*, should contain the modules of the application, which can be a combination of components, hooks, and providers

## Domain Knowledge
- The application is a web-based platform that requires a responsive design but we're prioritizing mobile first
- The application should be accessible and follow best practices for web accessibility (WCAG 2.1)
- The application should be performant and follow best practices for web performance (e.g., lazy loading, code splitting)

## Preferences
- Use functional components and React hooks
- Use TypeScript for type safety and better developer experience
- Use Tailwind CSS for styling and layout
- Use Tanstack Query for data fetching and caching
- Use Tanstack Router for routing and navigation
