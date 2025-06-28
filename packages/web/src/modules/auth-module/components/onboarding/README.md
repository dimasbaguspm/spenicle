# Onboarding Components

This directory contains the complete onboarding experience for SpendLess, with both desktop and mobile-optimized implementations.

## Components Overview

### `OnboardingDashboard` (Desktop)
- **Layout**: Two-column layout with sidebar context
- **Target**: Desktop and large tablet users
- **Features**: Rich contextual information, progress sidebar, detailed benefits

### `OnboardingMobile` (Mobile) 
- **Layout**: Full-screen step-by-step flow
- **Target**: Mobile and small screen users  
- **Features**: Thumb-friendly navigation, safe area compliance, progressive disclosure

### Shared Components
- `OnboardingProgress`: Reusable progress indicator for both desktop and mobile
- `OnboardingContext` & `QuickTips`: Contextual information panels
- `OnboardingSteps`: Individual step components (Welcome, Account, Categories, Complete)

## Usage

### Desktop Implementation
```tsx
import { OnboardingDashboard } from '@/modules/auth-module/components/onboarding';

export function DesktopOnboardingPage() {
  return <OnboardingDashboard autoProgress={true} progressDelay={800} />;
}
```

### Mobile Implementation  
```tsx
import { OnboardingMobile } from '@/modules/auth-module/components/onboarding';

export function MobileOnboardingPage() {
  return <OnboardingMobile autoProgress={true} progressDelay={600} />;
}
```

## Architecture Decisions

### Mobile-First Considerations
- **Touch Targets**: Minimum 44px for all interactive elements
- **Safe Areas**: Proper handling of notches and home indicators with `safe-area-*` classes
- **Navigation**: Bottom-positioned primary actions for thumb accessibility
- **Content**: Single-column flow to minimize cognitive load

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Readers**: Proper ARIA labels and semantic structure
- **Color Contrast**: WCAG AA compliant color combinations
- **Focus Management**: Clear focus indicators and logical tab order

### Performance
- **Code Splitting**: Mobile and desktop components can be loaded separately
- **Lazy Loading**: Step components load only when needed
- **Optimistic UI**: Immediate feedback for user actions with loading states

## Design System Integration

### Color Usage
- **Coral**: Primary actions, CTAs, progress indicators
- **Sage**: Secondary actions, success states  
- **Mist**: Tertiary actions, subtle backgrounds
- **Slate**: Text, professional elements
- **Semantic Colors**: Success, warning, info states

### Typography
- **Mobile**: Larger font sizes for readability (text-lg, text-xl, text-2xl)
- **Desktop**: Standard hierarchy (text-sm, text-base, text-lg)

### Spacing
- **Mobile**: More generous spacing (p-6, p-8, mb-8)
- **Desktop**: Compact but comfortable (p-4, p-6, mb-6)

## State Management Architecture

### Centralized Onboarding State

The onboarding experience uses **state lifting** to ensure consistency across viewport changes:

```tsx
// Route level - Single source of truth
function RouteComponent() {
  const onboardingFlow = useOnboardingFlow(config); // Created once
  
  return isDesktop 
    ? <DesktopOnboardingPage onboardingFlow={onboardingFlow} />
    : <MobileOnboardingPage onboardingFlow={onboardingFlow} />;
}
```

### Benefits

- **State Persistence**: User progress is maintained when switching between desktop/mobile
- **Consistent Behavior**: Same flow logic regardless of screen size
- **Performance**: Avoids state recreation during viewport changes
- **Maintainability**: Single configuration point for all onboarding behavior

### Implementation Details

- `useOnboardingFlow` is called once at the route level
- Both desktop and mobile components receive the same state instance
- Configuration (like `progressDelay`) is responsive to viewport size
- State persists across component remounts during browser resize
