import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../hooks';
import { DesktopLoginPage, MobileLoginPage } from '../../modules/auth-module';

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
});

function LoginPage() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopLoginPage />;
  return <MobileLoginPage />;
}
