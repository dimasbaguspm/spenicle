import { Icon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FolderOpen,
  Globe,
  History,
  Lightbulb,
  PlusCircle,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
} from 'lucide-react';

import type { OnboardingStep } from '../../hooks/use-onboarding-flow';

export interface OnboardingContextProps {
  currentStep: OnboardingStep;
}

/**
 * Contextual information panel that provides relevant details
 * and benefits for each onboarding step
 */
export function OnboardingContext({ currentStep }: OnboardingContextProps) {
  const content = {
    welcome: {
      title: 'Why SpendLess?',
      items: [
        { icon: BarChart3, text: 'Smart analytics & visual insights' },
        { icon: Target, text: 'Budget tracking made simple' },
        { icon: Shield, text: 'Self-hosted privacy guaranteed' },
        { icon: Globe, text: 'Beautiful desktop & mobile interface' },
      ],
    },
    account: {
      title: 'Payment Method Benefits',
      items: [
        { icon: CreditCard, text: 'Track multiple wallets & cards' },
        { icon: TrendingUp, text: 'Monitor balances manually' },
        { icon: History, text: 'Organize transaction records' },
        { icon: Shield, text: 'Local data - no bank connection' },
      ],
    },
    categories: {
      title: 'Smart Organization',
      items: [
        { icon: FolderOpen, text: 'Custom categories for your lifestyle' },
        { icon: BarChart3, text: 'Automatic spending insights' },
        { icon: Target, text: 'Budget goals by category' },
        { icon: Smartphone, text: 'Quick expense entry' },
        { icon: AlertTriangle, text: 'Required for meaningful reports' },
      ],
    },
    complete: {
      title: "What's Next?",
      items: [
        { icon: PlusCircle, text: 'Add your first expense' },
        { icon: BarChart3, text: 'View spending dashboard' },
        { icon: Target, text: 'Set up budget goals' },
        { icon: Smartphone, text: 'Access from any device' },
      ],
    },
  };

  const current = content[currentStep];

  return (
    <Tile>
      <Text as="h3" fontSize="base" fontWeight="semibold" className="mb-2">
        {current.title}
      </Text>
      <ul className="space-y-3">
        {current.items.map((item, index) => (
          <li key={index} className="flex items-center gap-3">
            <Icon as={item.icon} size="md" color="primary" />
            <Text as="span" fontSize="sm">
              {item.text}
            </Text>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

export interface QuickTipsProps {
  currentStep: OnboardingStep;
}

/**
 * Quick tips panel that provides helpful hints
 * relevant to the current onboarding step
 */
export function QuickTips({ currentStep }: QuickTipsProps) {
  const tips = {
    welcome: {
      icon: Lightbulb,
      text: 'You can always customize everything later from your settings.',
    },
    account: {
      icon: AlertTriangle,
      text: 'Create at least one payment method (wallet, card, etc.) to organize your expense tracking.',
    },
    categories: {
      icon: AlertTriangle,
      text: 'Categories help organize expenses and provide meaningful insights.',
    },
    complete: {
      icon: Lightbulb,
      text: 'Explore the dashboard to discover all features and start tracking.',
    },
  };

  const currentTip = tips[currentStep];

  return (
    <Tile>
      <div className="flex items-start gap-3">
        <div className="flex h-5 w-5 items-center justify-center flex-shrink-0 mt-0.5">
          <Icon as={currentTip.icon} size="sm" color="warning" />
        </div>
        <Text as="p" fontSize="sm">
          {currentTip.text}
        </Text>
      </div>
    </Tile>
  );
}
