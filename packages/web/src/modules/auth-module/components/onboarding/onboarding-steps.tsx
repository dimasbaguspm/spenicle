import { Button, Icon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import { Building2, CheckCircle, ChevronRight, DollarSign, FolderOpen, PartyPopper } from 'lucide-react';

export interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex flex-col gap-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Icon as={DollarSign} size="xl" color="neutral" />
        </div>

        <div>
          <Text as="h2" fontSize="2xl" fontWeight="bold" className="mb-4" align="center">
            Ready to Start Your Financial Journey?
          </Text>
          <Text as="p" fontSize="lg" align="center">
            Spenicle helps you track expenses, understand spending patterns, and make better financial decisions. Let's
            get you set up with the essentials.
          </Text>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button size="md" onClick={onStart}>
          Let's Get Started
          <Icon as={ChevronRight} size="md" color="neutral" />
        </Button>
      </div>
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <Icon as={CheckCircle} size="xl" color="neutral" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">Payment Method Created Successfully!</h3>
        <p className="text-slate-600">Moving to the next step...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-full gap-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon as={Building2} size="xl" color="primary" />
      </div>

      <div>
        <Text as="h2" fontSize="xl" fontWeight="semibold" align="center">
          Add Your First Payment Method
        </Text>
        <Text as="p" className="text-slate-600" align="center">
          Create payment methods for your wallet, credit cards, or bank accounts to organize and track your spending
          locally.
        </Text>
      </div>

      <Tile variant="primary">
        <Text as="p" fontSize="sm" color="primary">
          <strong>Required:</strong> Payment methods help you organize expenses by source
        </Text>
        <br />
        <Text as="p" fontSize="sm" color="primary">
          No bank connection needed - everything stays private on your server
        </Text>
      </Tile>

      <div className="flex justify-end mt-6">
        <Button size="md" onClick={onOpenDrawer}>
          Add Your First Payment Method
          <Icon as={ChevronRight} size="md" color="neutral" />
        </Button>
      </div>
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

  return (
    <div className="flex flex-col justify-center h-full gap-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon as={FolderOpen} size="xl" color="primary" />
      </div>

      <div>
        <Text as="h2" fontSize="xl" fontWeight="semibold" align="center">
          Organize with Categories
        </Text>
        <Text as="p" className="text-slate-600" align="center">
          Categories help you understand spending patterns and stay on budget.
        </Text>
      </div>

      <Tile variant="primary">
        <Text as="p" fontSize="sm" color="primary">
          <strong>Required:</strong> Categories help you organize expenses and understand your spending patterns.
        </Text>
        <br />
        <Text as="p" fontSize="sm" color="primary">
          Create at least one category to get meaningful insights from your transactions.
        </Text>
      </Tile>

      <div className="flex justify-end mt-6">
        <Button variant="primary" size="md" onClick={onOpenDrawer}>
          Create Your First Category
          <Icon as={ChevronRight} size="md" color="neutral" />
        </Button>
      </div>
    </div>
  );
}

export interface CompleteStepProps {
  onFinish: () => void;
  isLoading: boolean;
}

export function CompleteStep({ onFinish, isLoading }: CompleteStepProps) {
  return (
    <div className="flex flex-col justify-center h-full space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Icon as={PartyPopper} size="xl" color="primary" />
      </div>
      <div>
        <Text as="h2" fontSize="2xl" fontWeight="bold" className="mb-4" align="center">
          You're All Set!
        </Text>
        <Text as="p" fontSize="lg" align="center">
          Your Spenicle dashboard is ready. Explore features, track expenses, and take control of your financial future.
        </Text>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="md" onClick={onFinish}>
          {isLoading ? 'Setting up...' : 'Open Dashboard'}
          <Icon as={ChevronRight} size="md" color="neutral" />
        </Button>
      </div>
    </div>
  );
}
