import { Link } from '@tanstack/react-router';
import { BarChart3, Shield, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

import { Button, TextInput, FormLayout, Tile } from '../../../components';
import { useLoginForm } from '../components/login-form/use-login-form.hook';

export const DesktopLoginPage: FC = () => {
  const { register, handleSubmit, errors, isValid, isPending, onSubmit, validationRules } = useLoginForm();

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Tile className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-700 mb-2">Welcome Back</h2>
            <p className="text-slate-500">Sign in to your account</p>
          </div>

          {/* Login Form */}
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

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-3">
            <div className="text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-coral-600 hover:text-coral-700 font-medium transition-colors">
                Create one here
              </Link>
            </div>
          </div>
        </Tile>

        {/* Trust Indicators */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p className="mb-2">Trusted by thousands of users worldwide</p>
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Reliable
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Insightful
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
