import { TextInput } from '@dimasbaguspm/versaur/forms';
import { FormLayout } from '@dimasbaguspm/versaur/layouts';
import { Anchor, Brand, Button, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import { Link } from '@tanstack/react-router';
import type { FC } from 'react';

import { useLoginForm } from '../components/login-form/use-login-form.hook';
import { TrustedIndicators } from '../components/trusted-indicators';

export const MobileLoginPage: FC = () => {
  const { register, handleSubmit, errors, isValid, isPending, onSubmit, validationRules } = useLoginForm();

  return (
    <div className="flex flex-col">
      <div className="flex flex-row items-center gap-4 justify-center mb-8">
        <Brand size="lg" name="spenicle" shape="rounded" />
        <Text as="h2" fontSize="xl" fontWeight="bold">
          Spenicle
        </Text>
      </div>

      {/* Primary Login Form */}
      <Tile>
        {/* Form Header */}
        <div className="mb-6">
          <Text as="h2" fontSize="xl" fontWeight="bold" align="center">
            Sign In
          </Text>
          <Text as="p" align="center">
            Enter your credentials to continue
          </Text>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormLayout>
            <FormLayout.Column span={12}>
              <TextInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...register('email', validationRules.email)}
                autoFocus
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

          <Button type="submit" size="lg" className="w-full mt-6" disabled={!isValid || isPending}>
            {isPending ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="flex flex-row gap-2 justify-center items-center mt-6">
          <Text as="p" fontSize="sm" color="gray">
            Don't have an account?
          </Text>
          <Link to={'/register'}>
            <Anchor href="/register" fontSize="sm">
              Create one here
            </Anchor>
          </Link>
        </div>
      </Tile>

      {/* Minimal Trust Indicators */}
      <TrustedIndicators />
    </div>
  );
};
