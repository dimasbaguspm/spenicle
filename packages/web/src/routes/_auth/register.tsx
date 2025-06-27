import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../hooks';
import { DesktopRegisterPage, MobileRegisterPage } from '../../modules/auth-module';

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopRegisterPage />;
  return <MobileRegisterPage />;
}
