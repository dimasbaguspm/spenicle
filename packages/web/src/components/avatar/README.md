# Avatar Component

A secure, accessible avatar component with fallback support, designed following compound component patterns and modern React best practices.

## Features

- **Compound component pattern**: Use `Avatar.Image` and `Avatar.Fallback` for granular control
- **Security-first design**: URL validation and XSS prevention
- **Accessibility compliant**: WCAG 2.1 AA standards with proper ARIA attributes
- **Automatic fallback**: Displays initials when image fails to load
- **Type-safe**: Full TypeScript support with strict typing
- **Design system integration**: CVA-based styling with consistent variants
- **Performance optimized**: Lazy loading and error handling

## Usage

### Basic Usage
```tsx
import { Avatar } from '@/components/avatar';

function UserProfile() {
  return (
    <Avatar
      src="https://example.com/avatar.jpg"
      alt="John Doe"
      fallback="John Doe"
      size="lg"
      color="coral"
    />
  );
}
```

### Compound Pattern Usage
```tsx
import { Avatar } from '@/components/avatar';

function CustomAvatar() {
  return (
    <Avatar size="xl">
      <Avatar.Image 
        src="https://example.com/avatar.jpg" 
        alt="User avatar"
        loading="eager"
      />
      <Avatar.Fallback color="sage" size="xl">
        JD
      </Avatar.Fallback>
    </Avatar>
  );
}
```

### Fallback Only
```tsx
<Avatar fallback="John Doe" color="mist" size="md" />
```

## Props

### Avatar (Main Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | `undefined` | Image URL for the avatar |
| `alt` | `string` | `'Avatar'` | Alt text for the image |
| `fallback` | `string` | `undefined` | Text to generate initials from |
| `loading` | `'eager' \| 'lazy'` | `'lazy'` | Image loading strategy |
| `size` | `AvatarSize` | `'md'` | Avatar size variant |
| `color` | `AvatarColor` | `'coral'` | Color scheme for fallback |

### Avatar.Image

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | Required | Image URL (validated for security) |
| `alt` | `string` | `'Avatar'` | Alt text for accessibility |
| `loading` | `'eager' \| 'lazy'` | `'lazy'` | Loading strategy |
| `onError` | `function` | `undefined` | Error handler callback |

### Avatar.Fallback

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | `'?'` | Content to display (auto-generates initials from strings) |
| `color` | `AvatarColor` | `'coral'` | Color scheme |
| `size` | `AvatarSize` | `'md'` | Size variant |

## Variants

### Sizes
- `sm`: 32px (h-8 w-8)
- `md`: 40px (h-10 w-10) - Default
- `lg`: 48px (h-12 w-12)
- `xl`: 56px (h-14 w-14)

### Colors
- `coral`: Coral background with coral-700 text
- `sage`: Sage background with sage-700 text
- `mist`: Mist background with mist-700 text
- `slate`: Slate background with slate-700 text
- `cream`: Cream background with slate-700 text

## Security Features

- **URL validation**: Prevents JavaScript and data URL injection
- **XSS protection**: Input sanitization for fallback text
- **Safe image loading**: Crossorigin and referrer policy headers
- **Input validation**: Type checking and boundary validation

## Accessibility Features

- **Screen reader support**: Proper alt text and ARIA labels
- **High contrast**: WCAG compliant color combinations
- **Semantic HTML**: Uses appropriate elements and roles
- **Focus management**: Proper focus indicators when interactive

## File Structure

```
avatar/
├── avatar.tsx                 # Main component with compound pattern
├── index.ts                   # Barrel exports
├── types.ts                   # TypeScript interfaces
├── helpers.ts                 # Utility functions
├── README.md                  # Documentation
└── components/
    ├── avatar-image.tsx       # Image subcomponent
    └── avatar-fallback.tsx    # Fallback subcomponent
```

## Examples

### Different Sizes
```tsx
<Avatar src="/avatar.jpg" fallback="John Doe" size="sm" />
<Avatar src="/avatar.jpg" fallback="John Doe" size="md" />
<Avatar src="/avatar.jpg" fallback="John Doe" size="lg" />
<Avatar src="/avatar.jpg" fallback="John Doe" size="xl" />
```

### Color Variants
```tsx
<Avatar fallback="John Doe" color="coral" />
<Avatar fallback="Jane Smith" color="sage" />
<Avatar fallback="Bob Wilson" color="mist" />
<Avatar fallback="Alice Brown" color="slate" />
<Avatar fallback="Charlie Davis" color="cream" />
```

### Error Handling
```tsx
<Avatar
  src="/broken-image.jpg"
  fallback="John Doe"
  onError={(e) => console.log('Image failed to load')}
/>
```

## Performance Notes

- Images use lazy loading by default
- Fallback is always rendered for instant feedback
- Security validation is performed client-side
- Component uses React.forwardRef for ref forwarding

## Migration from Old Component

The new Avatar component maintains API compatibility while adding new features:

```tsx
// Old usage (still works)
<Avatar src="/avatar.jpg" fallback="John Doe" size="lg" color="coral" />

// New compound pattern (more flexible)
<Avatar size="lg">
  <Avatar.Image src="/avatar.jpg" alt="John Doe" />
  <Avatar.Fallback color="coral">John Doe</Avatar.Fallback>
</Avatar>
```
