# Brand Component

A flexible and accessible brand component for displaying the Spenicle logo, title, and tagline. Built with compound component pattern for maximum composability and customization.

## Features

- **Compound Components**: Use `Brand.Icon` and `Brand.Text` for flexible layouts
- **Polymorphic Component**: Render as any HTML element (button, div, a, etc.)
- **Multiple Sizes**: Small, medium, and large variants
- **Accessibility**: Full ARIA support and semantic HTML
- **Security**: Input sanitization and XSS prevention
- **TypeScript**: Comprehensive type safety with strict typing

## Usage

### Basic Brand

```tsx
import { Brand } from '@/components/brand';

function AppHeader() {
  return <Brand />;
}
```

### Brand as Link

```tsx
<Brand
  as="a"
  href="/"
  size="lg"
  subtitle="Simplify Spending, Maximize Savings"
/>
```

### Brand with Custom Subtitle

```tsx
<Brand
  size="sm"
  subtitle="Your Financial Companion"
  showTitle={true}
/>
```

### Compound Pattern Usage

```tsx
<div className="flex items-center gap-4">
  <Brand.Icon size="lg" />
  <Brand.Text 
    title="Spenicle" 
    subtitle="Custom tagline here"
    size="lg"
  />
</div>
```

### Brand without Title

```tsx
<Brand showTitle={false} />
```

## Component Structure

```
Brand/
├── brand.tsx                   # Main component
├── components/                 # Subcomponents
│   ├── brand-icon.tsx
│   └── brand-text.tsx
├── types.ts                    # TypeScript definitions
├── helpers.ts                  # Utility functions
├── index.tsx                   # Exports
└── README.md                   # Documentation
```

## Props

### Brand

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ElementType` | `'button'` | HTML element to render as |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `color` | `'default' \| 'alt'` | `'default'` | Color scheme |
| `subtitle` | `ReactNode` | `'Simplify Spending, Maximize Savings'` | Tagline text (sanitized) |
| `showTitle` | `boolean` | `true` | Whether to show the title and subtitle |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Additional content |

### Brand.Icon

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Icon size variant |
| `className` | `string` | - | Additional CSS classes |

### Brand.Text

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Spenicle'` | Brand title |
| `subtitle` | `ReactNode` | `'Simplify Spending, Maximize Savings'` | Tagline (sanitized) |
| `showTitle` | `boolean` | `true` | Whether to show content |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Text size variant |
| `className` | `string` | - | Additional CSS classes |

## Size Variants

- **`sm`**: Compact size for smaller spaces
- **`md`**: Standard size for general use  
- **`lg`**: Large size for prominent display

### Size Mappings

| Size | Icon | Gap | Title | Subtitle |
|------|------|-----|-------|----------|
| `sm` | `h-5 w-5` | `gap-2` | `text-lg` | `text-xs` |
| `md` | `h-6 w-6` | `gap-3` | `text-xl` | `text-sm` |
| `lg` | `h-7 w-7` | `gap-4` | `text-2xl` | `text-base` |

## Accessibility

- Semantic HTML with proper ARIA roles
- `aria-label` for screen readers
- `role="img"` for brand recognition
- Keyboard navigation support when interactive
- High contrast support

## Security

- Input sanitization for subtitle content
- XSS prevention for user-provided text
- HTML tag removal from subtitle strings
- Validated prop types and values

## Polymorphic Usage

The Brand component can render as any HTML element:

```tsx
// As button (default)
<Brand onClick={handleClick} />

// As link
<Brand as="a" href="/" />

// As div
<Brand as="div" />

// As header
<Brand as="h1" />
```

## Examples

### Navigation Header

```tsx
<nav className="flex items-center justify-between p-4">
  <Brand as="a" href="/" size="md" />
  <div>{/* Navigation items */}</div>
</nav>
```

### Loading Screen

```tsx
<div className="flex flex-col items-center justify-center min-h-screen">
  <Brand size="lg" />
  <p className="mt-4 text-slate-600">Loading...</p>
</div>
```

### Custom Layout

```tsx
<div className="flex flex-col items-center">
  <Brand.Icon size="lg" className="mb-2" />
  <Brand.Text 
    title="Spenicle Pro" 
    subtitle="Advanced financial management"
    size="lg"
  />
</div>
```

## Best Practices

1. **Accessibility**: Always ensure proper semantic markup when using as navigation
2. **Performance**: Use appropriate size variants for context
3. **Security**: All subtitle content is automatically sanitized
4. **Responsiveness**: Consider using different sizes for different breakpoints
5. **Branding**: Use consistently across the application for brand recognition
