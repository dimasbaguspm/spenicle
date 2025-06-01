import { createFileRoute } from '@tanstack/react-router';

import { RegisterForm } from '../../modules/auth-module';

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  return <RegisterForm />;
}
