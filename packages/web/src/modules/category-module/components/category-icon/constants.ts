import {
  ShoppingCart,
  Car,
  Home,
  Coffee,
  Gamepad2,
  Heart,
  Plane,
  GraduationCap,
  Briefcase,
  DollarSign,
  Gift,
  Wrench,
  Shirt,
  Utensils,
  Film,
  Music,
  Dumbbell,
  Smartphone,
  PiggyBank,
  Tag,
} from 'lucide-react';

export const CATEGORY_COLORS = [
  // Core solid colors
  { value: 'coral', label: 'Coral', color: 'bg-coral-500', ring: 'ring-coral-300' },
  { value: 'sage', label: 'Sage', color: 'bg-sage-500', ring: 'ring-sage-300' },
  { value: 'mist', label: 'Mist', color: 'bg-mist-500', ring: 'ring-mist-300' },
  { value: 'slate', label: 'Slate', color: 'bg-slate-600', ring: 'ring-slate-300' },

  // Core outline colors
  {
    value: 'coral-outline',
    label: 'Coral',
    color: 'border-2 border-coral-500 bg-white text-coral-500',
    ring: 'ring-coral-300',
  },
  {
    value: 'sage-outline',
    label: 'Sage',
    color: 'border-2 border-sage-500 bg-white text-sage-500',
    ring: 'ring-sage-300',
  },
  {
    value: 'mist-outline',
    label: 'Mist',
    color: 'border-2 border-mist-500 bg-white text-mist-500',
    ring: 'ring-mist-300',
  },
  {
    value: 'slate-outline',
    label: 'Slate',
    color: 'border-2 border-slate-600 bg-white text-slate-600',
    ring: 'ring-slate-300',
  },

  // Semantic solid colors
  { value: 'success', label: 'Success', color: 'bg-success-500', ring: 'ring-success-300' },
  { value: 'info', label: 'Info', color: 'bg-info-500', ring: 'ring-info-300' },
  { value: 'warning', label: 'Warning', color: 'bg-warning-500', ring: 'ring-warning-300' },
  { value: 'danger', label: 'Danger', color: 'bg-danger-500', ring: 'ring-danger-300' },

  // Semantic outline colors
  {
    value: 'success-outline',
    label: 'Success',
    color: 'border-2 border-success-500 bg-white text-success-500',
    ring: 'ring-success-300',
  },
  {
    value: 'info-outline',
    label: 'Info',
    color: 'border-2 border-info-500 bg-white text-info-500',
    ring: 'ring-info-300',
  },
  {
    value: 'warning-outline',
    label: 'Warning',
    color: 'border-2 border-warning-500 bg-white text-warning-500',
    ring: 'ring-warning-300',
  },
  {
    value: 'danger-outline',
    label: 'Danger',
    color: 'border-2 border-danger-500 bg-white text-danger-500',
    ring: 'ring-danger-300',
  },
];

export const CATEGORY_ICONS = [
  { value: 'shopping-cart', label: 'Shopping', icon: ShoppingCart },
  { value: 'car', label: 'Transportation', icon: Car },
  { value: 'home', label: 'Housing', icon: Home },
  { value: 'coffee', label: 'Food & Dining', icon: Coffee },
  { value: 'utensils', label: 'Restaurants', icon: Utensils },
  { value: 'gamepad-2', label: 'Entertainment', icon: Gamepad2 },
  { value: 'film', label: 'Movies', icon: Film },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'heart', label: 'Health', icon: Heart },
  { value: 'dumbbell', label: 'Fitness', icon: Dumbbell },
  { value: 'plane', label: 'Travel', icon: Plane },
  { value: 'graduation-cap', label: 'Education', icon: GraduationCap },
  { value: 'briefcase', label: 'Work', icon: Briefcase },
  { value: 'dollar-sign', label: 'Income', icon: DollarSign },
  { value: 'gift', label: 'Gifts', icon: Gift },
  { value: 'wrench', label: 'Maintenance', icon: Wrench },
  { value: 'shirt', label: 'Clothing', icon: Shirt },
  { value: 'smartphone', label: 'Technology', icon: Smartphone },
  { value: 'piggy-bank', label: 'Savings', icon: PiggyBank },
  { value: 'tag', label: 'General', icon: Tag },
];
