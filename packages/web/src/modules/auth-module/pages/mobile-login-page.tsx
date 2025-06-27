import { Link } from '@tanstack/react-router';
import { Shield, TrendingUp, BarChart3 } from 'lucide-react';
import type { FC } from 'react';

import { Button, TextInput, FormLayout, Tile, Brand } from '../../../components';
import { useLoginForm } from '../components/login-form/use-login-form.hook';

export const MobileLoginPage: FC = () => {
  const { register, handleSubmit, errors, isValid, isPending, onSubmit, validationRules } = useLoginForm();

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col px-6 py-8">
      {/* Compact Brand Section */}
      <div className="text-center mb-8 mt-8">
        <Brand as="div" size="md" className="justify-center mb-4" />
        <p className="text-slate-600 text-sm">Welcome back to your financial dashboard</p>
      </div>

      {/* Primary Login Form */}
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-start">
        <Tile>
          <div className="p-6">
            {/* Form Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-700 mb-2">Sign In</h1>
              <p className="text-slate-500 text-sm">Enter your credentials to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    autoFocus
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
                className="w-full mt-6"
                disabled={!isValid || isPending}
                busy={isPending}
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <div className="text-slate-500 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-coral-600 hover:text-coral-700 font-medium transition-colors">
                  Create one here
                </Link>
              </div>
            </div>
          </div>
        </Tile>

        {/* Minimal Trust Indicators */}
        <div className="mt-6 text-center pb-4">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Reliable
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Trusted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
