# Spendless App Color Palette 🎨

## Overview
Your Spendless app features a clean, focused color palette perfect for financial applications with clear hierarchy and accessibility.

## Core Colors

### 🔥 Coral (Primary)
- **Color**: `#e07a5f` - Vibrant, engaging primary color
- **Use for**: Primary buttons, CTAs, important highlights
- **Psychology**: Energetic, friendly, action-oriented
- **Best for**: Main actions, featured content, primary navigation

### 🌿 Sage (Secondary) 
- **Color**: `#81b29a` - Calming green for balance
- **Use for**: Secondary buttons, success states, positive indicators
- **Psychology**: Calming, natural, trustworthy
- **Best for**: Confirmations, secondary actions, balance indicators

### 🌫️ Mist (Tertiary)
- **Color**: Soft blue-gray - Professional supporting color
- **Use for**: Tertiary buttons, subtle backgrounds, borders
- **Psychology**: Trustworthy, professional, calming
- **Best for**: Form elements, card backgrounds, dividers

### 🔘 Slate (Ghost)
- **Color**: `#3d405b` - Professional dark color
- **Use for**: Ghost buttons, text, minimal actions
- **Psychology**: Trustworthy, serious, professional
- **Best for**: Text, subtle actions, professional elements

### ⚪ Cream (Neutral)
- **Color**: `#f4f1de` - Warm, neutral base color
- **Use for**: Backgrounds, neutral elements
- **Psychology**: Warm, stable, comfortable
- **Best for**: Page backgrounds, card surfaces

## Semantic Log Level Colors

### ✅ Success (Sage-Based Green)
- **Primary**: `#6db285` (success-500) - *Based on Sage color family*
- **Use for**: Completed transactions, achieved goals, successful operations
- **Available variants**: `success`, `success-outline`, `success-ghost`
- **Harmony**: Directly derived from sage family for perfect color cohesion

### ℹ️ Info (Mist-Based Blue)
- **Primary**: `#6b8fad` (info-500) - *Based on Mist color family*
- **Use for**: System notifications, account updates, informational messages
- **Available variants**: `info`, `info-outline`, `info-ghost`
- **Harmony**: Uses mist-600 as base for seamless integration

### ⚠️ Warning (Coral-Harmonized Amber)
- **Primary**: `#e08a47` (warning-500) - *Harmonized with Coral*
- **Use for**: Budget alerts, low balance warnings, attention needed
- **Available variants**: `warning`, `warning-outline`, `warning-ghost`
- **Harmony**: Warmer amber that complements coral's energy

### 🚨 Danger (Coral-Family Red)
- **Primary**: `#e06650` (danger-500) - *Harmonized with Coral family*
- **Use for**: Failed transactions, security alerts, critical errors
- **Available variants**: `danger`, `danger-outline`, `danger-ghost`
- **Harmony**: Warmer red that shares coral's warmth

## Button Variants Available

### Core Buttons
```tsx
<Button variant="coral">Primary Action</Button>
<Button variant="sage">Secondary Action</Button>
<Button variant="mist">Tertiary Action</Button>
<Button variant="slate">Ghost Action</Button>
```

### Outline Buttons
```tsx
<Button variant="coral-outline">Primary Outline</Button>
<Button variant="sage-outline">Secondary Outline</Button>
<Button variant="mist-outline">Tertiary Outline</Button>
<Button variant="slate-outline">Ghost Outline</Button>
```

### Semantic Buttons
```tsx
// Solid variants
<Button variant="success">Payment Successful</Button>
<Button variant="info">Account Updated</Button>
<Button variant="warning">Low Balance Alert</Button>
<Button variant="danger">Transaction Failed</Button>

// Outline variants
<Button variant="success-outline">Success Action</Button>
<Button variant="info-outline">Info Action</Button>
<Button variant="warning-outline">Warning Action</Button>
<Button variant="danger-outline">Danger Action</Button>

// Ghost variants (subtle)
<Button variant="success-ghost">Subtle Success</Button>
<Button variant="info-ghost">Subtle Info</Button>
<Button variant="warning-ghost">Subtle Warning</Button>
<Button variant="danger-ghost">Subtle Danger</Button>
```

### Utility Variants
```tsx
<Button variant="secondary">Secondary (Mist)</Button>
<Button variant="outline">Default Outline</Button>
<Button variant="ghost">Ghost (Slate)</Button>
```

## Color Usage Guidelines

### For Financial Apps
- **Primary Actions**: `coral` (engaging, energetic)
- **Secondary Actions**: `sage` (trustworthy, balanced) 
- **Tertiary Actions**: `mist` (subtle, professional)
- **Ghost Actions**: `slate` (minimal, professional)
- **Success States**: `sage` or semantic `success`
- **Backgrounds**: `cream-50`, `mist-50`
- **Text**: `slate-600` to `slate-900`

### Accessibility
- All colors meet WCAG AA contrast requirements when used properly
- Light shades (50-200) for backgrounds
- Medium shades (400-600) for interactive elements
- Dark shades (700-900) for text and high contrast needs

## Technical Implementation

### Tailwind Classes
Every color includes full range: `color-50` (lightest) to `color-900` (darkest)

```css
/* Examples */
bg-mist-100     /* Very light mist background */
text-coral-600  /* Medium coral text */
border-sage-300 /* Light sage border */
hover:bg-slate-50 /* Light slate hover state */
```

### CSS Custom Properties
All colors are registered as CSS custom properties:
```css
--color-coral-500: #e07a5f;
--color-sage-500: #81b29a;
--color-mist-500: #84a5c0;
--color-slate-600: #3d405b;
/* And more variants... */
```

## Color Psychology for Finance

### Primary Hierarchy
- **Coral**: Action-oriented, encourages engagement
- **Sage**: Trustworthy, balanced, natural
- **Mist**: Professional, calm, supportive
- **Slate**: Serious, reliable, minimal

## Quick Reference

| Color | Hex | Role | Psychology |
|-------|-----|------|-----------|
| Coral | `#e07a5f` | Primary | Energetic, friendly |
| Sage | `#81b29a` | Secondary | Calming, trustworthy |
| Mist | Soft blue-gray | Tertiary | Professional, subtle |
| Slate | `#3d405b` | Ghost | Serious, minimal |
| Cream | `#f4f1de` | Neutral | Warm, stable |

Your focused color palette is now ready for building a clean, professional financial application! 🚀
