# DatePicker Component

A flexible date picker component built with dayjs that supports both input-based and modal-only modes.

## Features

- Calendar-based date selection
- Month/year navigation
- Today and clear buttons
- Multiple size and color variants
- External modal control
- Input-based or modal-only modes
- Min/max date constraints
- Custom date formatting

## Usage

### Basic Input Mode (Default)

```tsx
import { DatePicker } from '@/components/date-picker';

function MyForm() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <DatePicker
      label="Select Date"
      value={date}
      onChange={setDate}
      placeholder="Choose a date..."
    />
  );
}
```

### Modal-Only Mode (Hidden Input)

```tsx
import { Button } from '@/components/button';
import { DatePicker } from '@/components/date-picker';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        {date ? date.toLocaleDateString() : 'Select Date'}
      </Button>
      
      <DatePicker
        showInput={false}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        value={date}
        onChange={setDate}
      />
    </div>
  );
}
```

### External Modal Control

You can control the modal state externally using the `isOpen` and `onOpenChange` props:

```tsx
const [modalOpen, setModalOpen] = useState(false);

<DatePicker
  isOpen={modalOpen}
  onOpenChange={setModalOpen}
  value={selectedDate}
  onChange={setSelectedDate}
  showInput={false} // Hide the input field
/>
```

## Props

### DatePickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Date \| string \| null` | - | The selected date value |
| `onChange` | `(date: Date \| null) => void` | - | Callback when date changes |
| `isOpen` | `boolean` | - | External control of modal state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when modal open state changes |
| `showInput` | `boolean` | `true` | Whether to show the text input |
| `placeholder` | `string` | `"Select a date..."` | Input placeholder text |
| `format` | `string` | `"MM/DD/YYYY"` | Date display format |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `minDate` | `Date \| string` | - | Minimum selectable date |
| `maxDate` | `Date \| string` | - | Maximum selectable date |
| `variant` | `"default" \| "coral" \| "sage" \| "mist" \| "slate"` | `"default"` | Color variant |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Size variant |
| `modalSize` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"` | Modal size |
| `showTodayButton` | `boolean` | `true` | Show "Today" button in footer |
| `showClearButton` | `boolean` | `true` | Show "Clear" button in footer |

## Color Variants

- `default` - Coral primary colors
- `coral` - Coral theme
- `sage` - Sage green theme  
- `mist` - Mist blue theme
- `slate` - Slate gray theme

## Examples

See the demo file for comprehensive examples of all variants and usage patterns.
