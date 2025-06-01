import { Link } from '@tanstack/react-router';

import { Button, TextInput, FormLayout } from '../../../../components';

import type { LoginFormProps } from './types';
import { useLoginForm } from './use-login-form.hook';

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const { register, handleSubmit, errors, isValid, isPending, onSubmit, validationRules } = useLoginForm({ onSuccess });

  return (
    <div className={`bg-white rounded-lg shadow-lg p-8 ${className ?? ''}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-700 mb-2">Welcome Back</h1>
        <p className="text-slate-500">Sign in to your SpendLess account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormLayout columns={1} gap="md">
          <FormLayout.Field>
            <TextInput
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              errorText={errors.email?.message}
              {...register('email', validationRules.email)}
              variant="default"
              size="lg"
            />
          </FormLayout.Field>

          <FormLayout.Field>
            <TextInput
              label="Password"
              type="password"
              placeholder="Enter your password"
              errorText={errors.password?.message}
              {...register('password', validationRules.password)}
              variant="default"
              size="lg"
            />
          </FormLayout.Field>
        </FormLayout>

        <Button
          type="submit"
          variant="coral"
          size="lg"
          className="w-full"
          disabled={!isValid || isPending}
          busy={isPending}
        >
          {isPending ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <div className="text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-coral-600 hover:text-coral-700 font-medium transition-colors">
            Create one here
          </Link>
        </div>
      </div>
    </div>
  );
}
