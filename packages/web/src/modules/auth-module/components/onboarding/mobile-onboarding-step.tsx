import { Icon } from '@dimasbaguspm/versaur';
import {
  Building2,
  Car,
  CheckCircle,
  CreditCard,
  DollarSign,
  Film,
  FolderOpen,
  Heart,
  Home,
  PartyPopper,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';

import type { OnboardingStep, StepProgress } from '../../hooks/use-onboarding-flow';

export interface MobileOnboardingStepProps {
  currentStep: OnboardingStep;
  progress: StepProgress;
}

/**
 * Mobile-optimized step content component
 * Each step is designed for mobile viewing with larger touch targets and simplified layouts
 */
export function MobileOnboardingStep({ currentStep, progress }: MobileOnboardingStepProps) {
  switch (currentStep) {
    case 'welcome':
      return <MobileWelcomeStep />;

    case 'account':
      return <MobileAccountStep isCompleted={progress.account} />;

    case 'categories':
      return <MobileCategoriesStep isCompleted={progress.categories} />;

    case 'complete':
      return <MobileCompleteStep />;

    default:
      return null;
  }
}

function MobileWelcomeStep() {
  return (
    <div className="flex flex-col justify-center h-full px-6 py-8">
      {/* Content */}
      <div className="flex-1 flex flex-col justify-center text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <Icon as={DollarSign} size="xl" color="neutral" />
        </div>

        <h1 className="mb-4 text-3xl font-bold text-slate-900">
          Welcome to <span className="text-coral-600">Spenicle</span>
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-slate-600 max-w-sm mx-auto">
          Take control of your finances with smart expense tracking, beautiful insights, and privacy-first design.
        </p>

        {/* Quick Benefits */}
        <div className="space-y-3 max-w-xs mx-auto">
          {[
            { icon: CreditCard, text: 'Track all payment methods' },
            { icon: FolderOpen, text: 'Smart category organization' },
            { icon: CheckCircle, text: 'Private & secure' },
          ].map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-100">
                <benefit.icon className="h-4 w-4 text-sage-600" />
              </div>
              <span className="text-sm text-slate-700">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MobileAccountStepProps {
  onOpenDrawer: () => void;
  isCompleted: boolean;
}

function MobileAccountStep({ isCompleted }: Pick<MobileAccountStepProps, 'isCompleted'>) {
  if (isCompleted) {
    return (
      <div className="flex flex-col justify-center items-center h-full px-6 py-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
          <CheckCircle className="h-10 w-10 text-success-600" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-slate-900">Payment Method Added!</h2>
        <p className="text-lg text-slate-600">Moving to the next step...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-full px-6 py-8">
      <div className="text-center mb-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-coral-100">
          <Building2 className="h-10 w-10 text-coral-600" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Add Your First Payment Method</h2>
        <p className="text-lg text-slate-600 leading-relaxed max-w-sm mx-auto">
          Create payment methods for your wallet, credit cards, or bank accounts to organize your spending locally.
        </p>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl border border-coral-200 bg-coral-50 p-6">
        <h3 className="mb-3 font-semibold text-coral-800">Why This Matters</h3>
        <ul className="space-y-2 text-sm text-coral-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Organize expenses by source (wallet, cards, etc.)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>No bank connection needed - stays private</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Required for meaningful expense tracking</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

interface MobileCategoriesStepProps {
  isCompleted: boolean;
}

function MobileCategoriesStep({ isCompleted }: MobileCategoriesStepProps) {
  if (isCompleted) {
    return (
      <div className="flex flex-col justify-center items-center h-full px-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
          <CheckCircle className="h-10 w-10 text-success-600" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-slate-900">Category Created!</h2>
        <p className="text-lg text-slate-600">Finishing up your setup...</p>
      </div>
    );
  }

  const suggestedCategories = [
    { name: 'Food & Dining', icon: UtensilsCrossed },
    { name: 'Transportation', icon: Car },
    { name: 'Shopping', icon: ShoppingBag },
    { name: 'Housing', icon: Home },
    { name: 'Healthcare', icon: Heart },
    { name: 'Entertainment', icon: Film },
  ];

  return (
    <div className="flex flex-col justify-center h-full px-6 py-8">
      <div className="text-center mb-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <FolderOpen className="h-10 w-10 text-sage-600" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Organize with Categories</h2>
        <p className="text-lg text-slate-600 leading-relaxed max-w-sm mx-auto">
          Categories help you understand spending patterns and stay on budget.
        </p>
      </div>

      {/* Suggested Categories */}
      <div className="mb-8">
        <h3 className="mb-4 text-center font-semibold text-slate-700">Popular categories to inspire you:</h3>
        <div className="grid grid-cols-2 gap-3">
          {suggestedCategories.map((category, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl bg-white border border-mist-200 p-4">
              <category.icon className="h-5 w-5 text-slate-500 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl border border-sage-200 bg-sage-50 p-6">
        <h3 className="mb-3 font-semibold text-sage-800">Why Categories Matter</h3>
        <ul className="space-y-2 text-sm text-sage-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Understand where your money goes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Set budgets by spending type</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Required for meaningful insights</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function MobileCompleteStep() {
  return (
    <div className="flex flex-col justify-center h-full px-6 py-8">
      {/* Content */}
      <div className="text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-success-100">
          <PartyPopper className="h-12 w-12 text-success-600" />
        </div>

        <h1 className="mb-4 text-3xl font-bold text-slate-900">You're All Set!</h1>

        <p className="mb-8 text-lg text-slate-600 leading-relaxed max-w-sm mx-auto">
          Congratulations! Your SpendLess account is ready. You can always add more payment methods and categories
          later.
        </p>

        {/* Next Steps */}
        <div className="space-y-3 max-w-xs mx-auto">
          {[
            { icon: CheckCircle, text: 'Add your first expense' },
            { icon: FolderOpen, text: 'View spending dashboard' },
            { icon: CreditCard, text: 'Set up budget goals' },
          ].map((step, index) => (
            <div key={index} className="flex items-center gap-3 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-100">
                <step.icon className="h-4 w-4 text-coral-600" />
              </div>
              <span className="text-sm text-slate-700">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
