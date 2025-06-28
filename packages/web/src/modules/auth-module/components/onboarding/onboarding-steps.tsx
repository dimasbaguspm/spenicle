import {
  Building2,
  Car,
  CheckCircle,
  DollarSign,
  Film,
  FolderOpen,
  Heart,
  Home,
  PartyPopper,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';

import { Button, FormLayout } from '../../../../components';

export interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-coral-100">
        <DollarSign className="h-10 w-10 text-coral-600" />
      </div>
      <h2 className="mb-4 text-2xl font-bold text-slate-900">Ready to take control of your finances?</h2>
      <p className="mb-8 text-lg leading-relaxed text-slate-600">
        SpendLess helps you track expenses, understand spending patterns, and make better financial decisions. Let's get
        you set up with the essentials.
      </p>
      <Button variant="coral" size="lg" onClick={onStart} className="px-8 py-4 text-lg font-semibold">
        Let's Get Started
      </Button>
    </div>
  );
}

export interface AccountStepProps {
  onOpenDrawer: () => void;
  isCompleted: boolean;
}

export function AccountStep({ onOpenDrawer, isCompleted }: AccountStepProps) {
  if (isCompleted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <CheckCircle className="h-8 w-8 text-success-600" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">Payment Method Created Successfully!</h3>
        <p className="text-slate-600">Moving to the next step...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral-100">
          <Building2 className="h-8 w-8 text-coral-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Add Your First Payment Method</h2>
        <p className="text-slate-600">
          Create payment methods for your wallet, credit cards, or bank accounts to organize and track your spending
          locally.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-coral-200 bg-coral-50 p-4">
        <p className="text-sm text-coral-700">
          <strong>Required:</strong> Payment methods help you organize expenses by source (wallet, cards, etc.). No bank
          connection needed - everything stays private on your device.
        </p>
      </div>

      <FormLayout>
        <FormLayout.Field span="full">
          <Button variant="coral" size="lg" onClick={onOpenDrawer} className="w-full">
            Add Your First Payment Method
          </Button>
        </FormLayout.Field>
      </FormLayout>
    </div>
  );
}

export interface CategoriesStepProps {
  onOpenDrawer: () => void;
  isCompleted: boolean;
}

export function CategoriesStep({ onOpenDrawer, isCompleted }: CategoriesStepProps) {
  if (isCompleted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <CheckCircle className="h-8 w-8 text-success-600" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">Category Created!</h3>
        <p className="text-slate-600">Finishing up your setup...</p>
      </div>
    );
  }

  const suggestedCategories = [
    { name: 'Food & Dining', icon: UtensilsCrossed, color: 'coral' },
    { name: 'Transportation', icon: Car, color: 'sage' },
    { name: 'Shopping', icon: ShoppingBag, color: 'mist' },
    { name: 'Housing', icon: Home, color: 'coral' },
    { name: 'Healthcare', icon: Heart, color: 'sage' },
    { name: 'Entertainment', icon: Film, color: 'mist' },
  ];

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100">
          <FolderOpen className="h-8 w-8 text-sage-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Organize with Categories</h2>
        <p className="text-slate-600">Categories help you understand spending patterns and stay on budget.</p>
      </div>

      <div className="mb-6 rounded-lg border border-sage-200 bg-sage-50 p-4">
        <p className="text-sm text-sage-700">
          <strong>Required:</strong> Categories help you organize expenses and understand your spending patterns. Create
          at least one category to get meaningful insights from your transactions.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-slate-700">Popular categories to inspire you:</h3>
        <div className="grid grid-cols-2 gap-2">
          {suggestedCategories.map((category, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <category.icon className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-600">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      <FormLayout>
        <FormLayout.Field span="full">
          <Button variant="sage" size="lg" onClick={onOpenDrawer} className="w-full">
            Create Your First Category
          </Button>
        </FormLayout.Field>
      </FormLayout>
    </div>
  );
}

export interface CompleteStepProps {
  onFinish: () => void;
  isLoading: boolean;
}

export function CompleteStep({ onFinish, isLoading }: CompleteStepProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
        <PartyPopper className="h-10 w-10 text-success-600" />
      </div>
      <h2 className="mb-4 text-2xl font-bold text-slate-900">You're All Set!</h2>
      <p className="mb-8 text-lg text-slate-600">
        Congratulations! Your SpendLess account is ready. You can always add more payment methods and categories later.
      </p>
      <Button variant="coral" size="lg" onClick={onFinish} busy={isLoading} className="px-8 py-4 text-lg font-semibold">
        {isLoading ? 'Setting up...' : 'Open Dashboard'}
      </Button>
    </div>
  );
}
