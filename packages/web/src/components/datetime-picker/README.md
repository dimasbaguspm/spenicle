# DateTime Picker Components

A comprehensive set of reusable datetime input picker components built with React, TypeScript, and Tailwind CSS. These components follow Material Design principles and integrate seamlessly with the existing design system.

## Components Overview

### DateTimePicker
The main component that combines date and time selection in a single input field. When clicked, it opens separate modals for date and time selection.

### TimePicker
A standalone time picker component with Material Design-inspired clock interface.

## Features

- **🎨 Design System Integration**: Uses the established color palette (coral, sage, mist, slate)
- **♿ Accessibility**: WCAG 2.1 compliant with proper keyboard navigation and ARIA labels
- **📱 Mobile First**: Responsive design optimized for mobile interactions
- **⏰ Time Formats**: Supports both 12-hour and 24-hour time formats
- **📅 Date Integration**: Seamlessly integrates with existing DatePicker component
- **🎯 Type Safety**: Full TypeScript support with comprehensive type definitions
- **🎭 Variants**: Multiple visual variants and sizes to match different contexts

## Usage Examples

### Basic DateTime Picker

```tsx
import { DateTimePicker } from '../components';

function MyComponent() {
  const [dateTime, setDateTime] = useState<Date | null>(null);

  return (
    <DateTimePicker
      label="Event Date & Time"
      value={dateTime}
      onChange={setDateTime}
      placeholder="Select when the event occurs..."
    />
  );
}
```

### 24-Hour Format

```tsx
<DateTimePicker
  label="Departure Time"
  value={dateTime}
  onChange={setDateTime}
  is24Hour={true}
  variant="mist"
/>
```

### Standalone Time Picker

```tsx
import { TimePicker } from '../components';

function TimeSelection() {
  const [time, setTime] = useState<{hour: number; minute: number} | null>(null);

  return (
    <TimePicker
      label="Meeting Time"
      value={time}
      onChange={setTime}
      is24Hour={false}
    />
  );
}
```

## Props

### DateTimePickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date \| null` | `null` | Current selected datetime |
| `onChange` | `(date: Date \| null) => void` | - | Callback when datetime changes |
| `label` | `string` | - | Input label text |
| `placeholder` | `string` | `"Select date and time..."` | Placeholder text |
| `is24Hour` | `boolean` | `false` | Use 24-hour time format |
| `variant` | `'default' \| 'coral' \| 'sage' \| 'mist' \| 'slate'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Input size |
| `disabled` | `boolean` | `false` | Disable the input |
| `required` | `boolean` | `false` | Mark as required field |
| `errorText` | `string` | - | Error message to display |
| `helperText` | `string` | - | Helper text to display |

### TimePickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `{hour: number; minute: number} \| string \| null` | `null` | Current selected time |
| `onChange` | `(time: {hour: number; minute: number} \| null) => void` | - | Callback when time changes |
| `is24Hour` | `boolean` | `false` | Use 24-hour time format |
| `showNowButton` | `boolean` | `true` | Show "Now" button in footer |
| `showClearButton` | `boolean` | `true` | Show "Clear" button in footer |

## Design Principles

### Material Design Clock Interface
The time picker follows Material Design guidelines with:
- Circular clock face with hour and minute selection
- Clear visual feedback for selected values
- Smooth transitions and hover states
- Intuitive AM/PM toggle for 12-hour format

### Color Usage
- **Coral (#e07a5f)**: Primary actions, selected states
- **Sage (#81b29a)**: Secondary elements, minute selector
- **Mist**: Neutral backgrounds, borders
- **Slate**: Text, subtle elements

### Accessibility Features
- Full keyboard navigation support
- Screen reader friendly with proper ARIA labels
- High contrast ratios for better visibility
- Focus management within modals
- Escape key to close modals

## File Structure

```
datetime-picker/
├── index.ts                 # Main exports
├── datetime-picker.tsx      # Combined date and time picker
├── demo.tsx                # Usage examples
└── README.md               # This documentation

time-picker/
├── index.ts                # Main exports
├── time-picker.tsx         # Main time picker component
├── time-picker-context.tsx # React context for state management
├── time-picker-clock.tsx   # Clock interface component
└── time-picker-footer.tsx  # Footer with action buttons
```

## Integration Notes

- Requires existing `DatePicker` component for date selection
- Uses existing `Modal` component for overlays
- Integrates with `TextInput` for consistent styling
- Compatible with existing form validation patterns
- Follows established component composition patterns

## Browser Support

- Modern browsers with ES2017+ support
- Mobile Safari iOS 12+
- Chrome 70+
- Firefox 65+
- Edge 79+
