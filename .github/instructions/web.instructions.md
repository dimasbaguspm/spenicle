---
applyTo: 'packages/web/**/*.{ts|tsx|js|jsx|json}'
---
This app is a web-based platform designed with a strong focus on professional UI and UX principles. The goal is to create an intuitive, accessible, and delightful experience for all users, making it easy to understand and interact with the application at every step—without violating the established color palette or design tokens (see COLOR_PALETTE.md).

## UI/UX Standards

- Prioritize clarity and simplicity in all user interactions; every screen and component should clearly communicate its purpose and current state.
- Use established color tokens and design guidelines for all interface elements to ensure visual consistency and brand alignment.
- Provide immediate, meaningful feedback for user actions (e.g., loading indicators, success/error messages, disabled states).
- Ensure all interactive elements are easily discoverable and have clear affordances.
- Use concise, user-friendly language for all labels, tooltips, and messages.
- Design for accessibility from the start (WCAG 2.1 AA or better): support keyboard navigation, screen readers, and sufficient color contrast.
- Favor mobile-first, responsive layouts that adapt gracefully to all screen sizes.
- Use whitespace and layout to guide attention and reduce cognitive load.
- Minimize the number of steps required to complete common tasks; streamline flows wherever possible.
- Use progressive disclosure to avoid overwhelming users with information or options.
- When introducing new features or complex flows, provide contextual help or onboarding cues.
- Validate user input in real-time and provide actionable, friendly error messages.
- Ensure performance optimizations do not compromise the clarity or usability of the interface.

## Preferences

- Use functional components and React hooks for UI logic.
- Use TypeScript for type safety and maintainability.
- Use Tailwind CSS for styling, strictly adhering to the defined color palette and design tokens.
- Use Tanstack Query and Tanstack Router for data and navigation, ensuring loading and error states are clearly communicated to users.
- Favor modular, reusable components that can be easily composed for different flows.
- Document any UX decisions or deviations from standard patterns with clear rationale.

## Goal

Every user should feel confident and in control while using the application, with the interface guiding them naturally and transparently through their tasks—never surprising, confusing, or overwhelming them.