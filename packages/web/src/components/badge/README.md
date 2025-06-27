# Badge Component

A secure, accessible badge component designed for status indicators, labels, and notifications with compound component patterns and modern React best practices.

## Features

- **Compound component pattern**: Use `Badge.Icon` and `Badge.Content` for granular control
- **Security-first design**: Content sanitization and XSS prevention
- **Accessibility compliant**: WCAG 2.1 AA standards with proper ARIA attributes and semantic roles
- **Comprehensive variants**: 40+ style combinations with semantic and color variants
- **Type-safe**: Full TypeScript support with strict typing
- **Design system integration**: CVA-based styling with consistent variants
- **Backward compatible**: Maintains existing API while adding new features

## Usage

### Basic Usage
```tsx
import { Badge } from '@/components/badge';

function StatusIndicator() {
  return (
    <Badge variant="success" size="md">
      Active
    </Badge>
  );
}
```

### Compound Pattern Usage
```tsx
import { Badge } from '@/components/badge';
import { CheckCircle } from 'lucide-react';

function StatusBadgeWithIcon() {
  return (
    <Badge variant="success" size="lg">
      <Badge.Icon icon={CheckCircle} position="left" />
      <Badge.Content>Completed</Badge.Content>
    </Badge>
  );
}
```

### Semantic Variants
```tsx
// Status indicators
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="info">Information</Badge>

// Different styles
<Badge variant="success-outline">Success Outline</Badge>
<Badge variant="warning-ghost">Warning Ghost</Badge>
```

## Props

### Badge (Main Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `BadgeVariant` | `'default'` | Visual and semantic variant |
| `size` | `BadgeSize` | `'md'` | Component size |
| `children` | `React.ReactNode` | `undefined` | Badge content (auto-sanitized) |

Inherits all props from `HTMLSpanElement`.

### Badge.Icon

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `React.ComponentType<React.SVGProps<SVGSVGElement>>` | Required | Icon component to render |
| `size` | `BadgeSize` | `'md'` | Icon size (matches badge size) |
| `position` | `'left' \| 'right'` | `'left'` | Icon position relative to content |

### Badge.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | Required | Content to display |
| `truncate` | `boolean` | `false` | Whether to truncate long content |
| `maxLength` | `number` | `20` | Maximum characters before truncation |

## Variants

### Core Variants
- `default`: Coral background with cream text
- `secondary`: Sage background with cream text
- `tertiary`: Mist background with white text
- `outline`: Transparent background with border
- `ghost`: Light background with colored text

### Color Variants
Each color comes in three styles: solid, outline, and ghost
- `coral`, `coral-outline`, `coral-ghost`
- `sage`, `sage-outline`, `sage-ghost`
- `mist`, `mist-outline`, `mist-ghost`
- `slate`, `slate-outline`, `slate-ghost`

### Semantic Variants
For status and notification purposes:
- `success`, `success-outline`, `success-ghost`
- `info`, `info-outline`, `info-ghost`
- `warning`, `warning-outline`, `warning-ghost`
- `danger`, `danger-outline`, `danger-ghost`
- `error`, `error-outline`, `error-ghost` (legacy, maps to danger)

### Sizes
- `sm`: 20px height, 2px padding
- `md`: 24px height, 2.5px padding - Default
- `lg`: 28px height, 3px padding
- `xl`: 32px height, 4px padding

## Security Features

- **Content sanitization**: Removes script tags and dangerous HTML
- **XSS protection**: Strips JavaScript URLs and event handlers
- **Input validation**: Validates all props against allowed values
- **Safe defaults**: Falls back to secure defaults for invalid inputs

## Accessibility Features

- **Screen reader support**: Uses `role="status"` for semantic meaning
- **Descriptive labels**: Auto-generates accessible labels based on semantic type
- **High contrast**: WCAG compliant color combinations
- **Focus management**: Proper focus indicators when interactive
- **Semantic HTML**: Uses appropriate span elements with ARIA attributes

## File Structure

```
badge/
├── badge.tsx                 # Main component with compound pattern
├── index.ts                  # Barrel exports
├── types.ts                  # TypeScript interfaces
├── helpers.ts                # Utility functions
├── README.md                 # Documentation
└── components/
    ├── badge-icon.tsx        # Icon subcomponent
    └── badge-content.tsx     # Content subcomponent
```

## Examples

### Different Sizes
```tsx
<Badge variant="info" size="sm">Small</Badge>
<Badge variant="info" size="md">Medium</Badge>
<Badge variant="info" size="lg">Large</Badge>
<Badge variant="info" size="xl">Extra Large</Badge>
```

### Status Indicators
```tsx
<Badge variant="success">✓ Completed</Badge>
<Badge variant="warning">⚠ Pending</Badge>
<Badge variant="danger">✗ Failed</Badge>
<Badge variant="info">ℹ Information</Badge>
```

### With Icons
```tsx
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

<Badge variant="success">
  <Badge.Icon icon={CheckCircle} />
  <Badge.Content>Success</Badge.Content>
</Badge>

<Badge variant="warning">
  <Badge.Icon icon={AlertTriangle} />
  <Badge.Content>Warning</Badge.Content>
</Badge>
```

### Truncated Content
```tsx
<Badge variant="info" size="sm">
  <Badge.Content truncate maxLength={10}>
    This is a very long badge content that will be truncated
  </Badge.Content>
</Badge>
```

### Custom Styling
```tsx
<Badge 
  variant="coral-ghost" 
  size="lg"
  className="border-2 border-dashed"
>
  Custom Style
</Badge>
```

## Performance Notes

- Content is sanitized client-side for security
- Compound components are tree-shaken when not used
- Focus styles only load when needed
- Validates props once per render for optimal performance

## Migration from Old Component

The refactored Badge component maintains full API compatibility:

```tsx
// Old usage (still works exactly the same)
<Badge variant="success" size="lg">Active</Badge>

// New compound pattern (more flexible)
<Badge variant="success" size="lg">
  <Badge.Icon icon={CheckIcon} />
  <Badge.Content>Active</Badge.Content>
</Badge>

// New security features (automatic)
<Badge>User input content</Badge> // Auto-sanitized for security
```

## Security Considerations

- All user content is automatically sanitized
- Variant validation prevents style injection
- Safe fallbacks for all invalid inputs
- No eval() or innerHTML usage
- Content Security Policy compliant

## Browser Support

- Modern browsers with ES2017+ support
- Proper fallbacks for older browsers
- Screen reader compatibility tested
- High contrast mode support
