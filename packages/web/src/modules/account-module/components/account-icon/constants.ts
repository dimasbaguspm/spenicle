import {
  Banknote,
  Building,
  Calculator,
  CircleDollarSign,
  Coins,
  CreditCard,
  DollarSign,
  HandCoins,
  Landmark,
  PiggyBank,
  Receipt,
  Shield,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
  University,
  Vault,
  Wallet,
  Zap,
} from 'lucide-react';

export const ACCOUNT_COLORS = [
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

export const ACCOUNT_ICONS = [
  { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'piggy-bank', label: 'Piggy Bank', icon: PiggyBank },
  { value: 'building', label: 'Building', icon: Building },
  { value: 'trending-up', label: 'Investment', icon: TrendingUp },
  { value: 'banknote', label: 'Cash', icon: Banknote },
  { value: 'circle-dollar-sign', label: 'Dollar', icon: CircleDollarSign },
  { value: 'hand-coins', label: 'Savings', icon: HandCoins },
  { value: 'landmark', label: 'Bank', icon: Landmark },
  { value: 'shield', label: 'Safe', icon: Shield },
  { value: 'coins', label: 'Coins', icon: Coins },
  { value: 'dollar-sign', label: 'Dollar Sign', icon: DollarSign },
  { value: 'receipt', label: 'Receipt', icon: Receipt },
  { value: 'trending-down', label: 'Loss', icon: TrendingDown },
  { value: 'university', label: 'University', icon: University },
  { value: 'vault', label: 'Vault', icon: Vault },
  { value: 'zap', label: 'Quick Pay', icon: Zap },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'calculator', label: 'Calculator', icon: Calculator },
  { value: 'smartphone', label: 'Mobile Pay', icon: Smartphone },
];
