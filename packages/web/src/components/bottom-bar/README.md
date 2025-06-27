# BottomBar Component

A flexible and accessible bottom bar component for Spenicle applications. Built with compound component pattern for maximum composability and customization.

## Features

- **Compound Components**: Use `BottomBar.Content`, `BottomBar.Action`, `BottomBar.Group`, `BottomBar.IconButton`, and `BottomBar.Separator` for flexible layouts
- **Multiple Variants**: Default, floating, and compact styles
- **Auto-hide**: Configurable auto-hide with timeout
- **Scroll Behavior**: Optional hide-on-scroll functionality
- **Accessibility**: Full ARIA support and keyboard navigation
- **Security**: Input sanitization and XSS prevention
- **TypeScript**: Comprehensive type safety with strict typing

## Usage

### Basic Bottom Bar

```tsx
import { BottomBar } from '@/components/bottom-bar';

function AppBottomBar() {
  return (
    <BottomBar variant="default">
      <BottomBar.Content>
        <BottomBar.Group spacing="md">
          <BottomBar.IconButton
            icon={<HomeIcon />}
            tooltip="Home"
            variant="coral"
          />
          <BottomBar.Separator />
          <BottomBar.Action variant="primary">
            Save Changes
          </BottomBar.Action>
        </BottomBar.Group>
      </BottomBar.Content>
    </BottomBar>
  );
}
```

### Floating Bottom Bar with Auto-hide

```tsx
<BottomBar
  variant="floating"
  autoHide={5}
  hideOnScroll={true}
  onVisibilityChange={(visible) => console.log('Visibility:', visible)}
>
  <BottomBar.Content align="center">
    <BottomBar.Group spacing="lg">
      <BottomBar.IconButton
        icon={<MessageIcon />}
        badge="3"
        badgeVariant="danger"
        tooltip="Messages"
      />
      <BottomBar.IconButton
        icon={<SettingsIcon />}
        tooltip="Settings"
      />
    </BottomBar.Group>
  </BottomBar.Content>
</BottomBar>
```

## Component Structure

```
BottomBar/
├── bottom-bar.tsx              # Main component
├── components/                 # Subcomponents
│   ├── bottom-bar-action.tsx
│   ├── bottom-bar-content.tsx
│   ├── bottom-bar-group.tsx
│   ├── bottom-bar-icon-button.tsx
│   └── bottom-bar-separator.tsx
├── types.ts                    # TypeScript definitions
├── helpers.ts                  # Utility functions
├── index.ts                    # Exports
└── README.md                   # Documentation
```

## Props

### BottomBar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Content to render inside the bottom bar |
| `className` | `string` | - | Additional CSS classes |
| `variant` | `'default' \| 'floating' \| 'compact'` | `'default'` | Visual style variant |
| `hideOnScroll` | `boolean` | `false` | Hide when scrolling down |
| `backdrop` | `boolean` | `false` | Show backdrop overlay |
| `autoHide` | `number` | - | Auto-hide after X seconds (1-300) |
| `onVisibilityChange` | `(visible: boolean) => void` | - | Visibility change callback |

### BottomBar.IconButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `ReactNode` | - | Icon element to display |
| `badge` | `string \| number` | - | Badge content (sanitized) |
| `badgeVariant` | `BadgeVariant` | `'coral'` | Badge color variant |
| `tooltip` | `string` | - | Tooltip text (sanitized) |
| `variant` | `IconButtonVariant` | `'slate-ghost'` | Button style variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Button size |
| `rounded` | `boolean` | `true` | Rounded corners |

### BottomBar.Separator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Separator direction |
| `variant` | `'light' \| 'normal' \| 'strong'` | `'normal'` | Visual weight |

## Variants

### BottomBar Variants

- **`default`**: Standard bottom bar with subtle background
- **`floating`**: Elevated bar with rounded corners and shadow
- **`compact`**: Minimal spacing for dense layouts

### IconButton Variants

- **Primary**: `coral`, `coral-outline`, `coral-ghost`
- **Secondary**: `sage`, `sage-outline`, `sage-ghost`
- **Tertiary**: `mist`, `mist-outline`, `mist-ghost`
- **Default**: `slate`, `slate-outline`, `slate-ghost`
- **Semantic**: `success`, `info`, `warning`, `danger` (with outline/ghost variants)

## Accessibility

- Semantic HTML with proper ARIA roles
- Keyboard navigation support
- Screen reader compatible
- Focus management and indicators
- High contrast support

## Security

- Input sanitization for tooltips and badges
- XSS prevention for user content
- Validated prop types and ranges
- Safe auto-hide duration limits (1-300 seconds)

## Examples

Check the component playground for interactive examples and use cases.

## Best Practices

1. **Accessibility**: Always provide `aria-label` or `tooltip` for icon buttons
2. **Performance**: Use `hideOnScroll` sparingly to avoid excessive re-renders
3. **Security**: All text content is automatically sanitized
4. **Responsiveness**: Test floating variant on different screen sizes
5. **Auto-hide**: Keep timeout between 3-10 seconds for optimal UX
