# AmountField Component

A secure, accessible input component specifically designed for numeric amount entry with an integrated calculator feature.

## Features

- **Security-first design**: Input validation and sanitization to prevent injection attacks
- **Accessibility compliant**: WCAG 2.1 AA standards with proper ARIA labels and keyboard navigation
- **Built-in calculator**: Modal calculator for complex calculations
- **Type-safe**: Full TypeScript support with strict typing
- **Customizable**: CVA-based styling with multiple variants and sizes
- **Form integration**: Works seamlessly with form libraries

## Usage

```tsx
import { AmountField } from '@/components/amount-field';

function MyForm() {
  const [amount, setAmount] = useState(0);

  return (
    <AmountField
      label="Amount"
      value={amount}
      onChange={setAmount}
      placeholder="Enter amount"
      helperText="Amount in your local currency"
      required
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| string` | `undefined` | Current amount value |
| `onChange` | `(value: number) => void` | `undefined` | Callback when value changes |
| `variant` | `AmountFieldVariant` | `'default'` | Visual variant |
| `size` | `AmountFieldSize` | `'md'` | Component size |
| `iconAriaLabel` | `string` | `'Open calculator'` | ARIA label for calculator button |
| `disabled` | `boolean` | `false` | Disable the input |
| `required` | `boolean` | `false` | Mark field as required |

Inherits all props from `TextInput` except `type`, `variant`, `size`, and `onChange`.

## Variants

- `default`: White background with mist borders
- `coral`: Coral-themed styling
- `sage`: Sage-themed styling  
- `mist`: Mist-themed styling
- `slate`: Slate-themed styling

## Sizes

- `sm`: Small (32px height)
- `md`: Medium (40px height) 
- `lg`: Large (48px height)
- `xl`: Extra large (56px height)

## Security Features

- **Input sanitization**: Removes non-numeric characters
- **Expression validation**: Validates calculator expressions before evaluation
- **Safe evaluation**: Protected against code injection in calculator
- **Boundary validation**: Enforces numeric limits and constraints

## Accessibility Features

- **Screen reader support**: Proper ARIA labels and descriptions
- **Keyboard navigation**: Full keyboard accessibility for all features
- **Focus management**: Proper focus indicators and management
- **Error announcements**: Live regions for error messages
- **Semantic HTML**: Uses proper form elements and structure

## File Structure

```
amount-field/
├── amount-field.tsx           # Main component
├── index.ts                   # Barrel exports
├── types.ts                   # TypeScript interfaces
├── helpers.ts                 # Utility functions
└── components/
    └── amount-field-calculator-modal.tsx  # Calculator subcomponent
```

## Examples

### Basic Usage
```tsx
<AmountField
  label="Price"
  value={price}
  onChange={setPrice}
/>
```

### With Validation
```tsx
<AmountField
  label="Budget"
  value={budget}
  onChange={setBudget}
  errorText={budgetError}
  required
/>
```

### Custom Styling
```tsx
<AmountField
  label="Amount"
  value={amount}
  onChange={setAmount}
  variant="coral"
  size="lg"
  className="custom-styles"
/>
```

## Calculator Feature

The integrated calculator provides:
- Basic arithmetic operations (+, -, *, /)
- Secure expression evaluation
- Keyboard and mouse input support
- Result validation before submission

Press the calculator icon or use keyboard navigation to open the calculator modal.
