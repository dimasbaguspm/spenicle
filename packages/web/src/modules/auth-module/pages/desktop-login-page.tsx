import { TextInput } from '@dimasbaguspm/versaur/forms';
import { FormLayout } from '@dimasbaguspm/versaur/layouts';
import { Button, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import { Link } from '@tanstack/react-router';
import type { FC } from 'react';

import { useLoginForm } from '../components/login-form/use-login-form.hook';
import { TrustedIndicators } from '../components/trusted-indicators';

export const DesktopLoginPage: FC = () => {
  const { register, handleSubmit, errors, isValid, isPending, onSubmit, validationRules } = useLoginForm();

  return (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Tile size="lg">
          {/* Header */}
          <div className="text-center mb-8">
            <Text as="h2" fontSize="3xl" fontWeight="bold" align="center">
              Welcome Back
            </Text>
            <Text as="p" align="center">
              Sign in to your account
            </Text>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormLayout>
              <FormLayout.Column span={12}>
                <TextInput
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  {...register('email', validationRules.email)}
                />
              </FormLayout.Column>

              <FormLayout.Column span={12}>
                <TextInput
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register('password', validationRules.password)}
                />
              </FormLayout.Column>
            </FormLayout>

            <Button type="submit" size="lg" className="w-full" disabled={!isValid || isPending}>
              {isPending ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="flex flex-row gap-2 justify-center mt-6">
            <Text as="p">Don't have an account?</Text>
            <Link to="/register">Create one here</Link>
          </div>
        </Tile>

        <TrustedIndicators />
      </div>
    </div>
  );
};
