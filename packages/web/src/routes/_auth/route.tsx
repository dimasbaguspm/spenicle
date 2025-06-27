import { createFileRoute, Outlet } from '@tanstack/react-router';
import { BarChart3, Shield, TrendingUp } from 'lucide-react';

import { Brand } from '../../components';
import { redirectIfAuthenticated, useViewport } from '../../hooks';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  beforeLoad: () => {
    redirectIfAuthenticated('/');
  },
});

function RouteComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-cream-50 flex">
        {/* Left Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-coral-500 to-coral-600 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
            <div className="absolute bottom-32 right-16 w-24 h-24 bg-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white rounded-full"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-16 py-12 text-white">
            {/* Logo/Brand */}
            <div className="mb-12">
              {/* Brand with background for better contrast */}
              <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Brand
                  as="div"
                  size="lg"
                  className="[&_span:first-child]:text-white [&_span:last-child]:text-white/90"
                />
              </div>
              <p className="text-white/90 text-lg font-medium">
                Take control of your financial future with intelligent expense tracking
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Smart Analytics</h3>
                  <p className="text-coral-100">
                    Discover spending patterns with intelligent insights and beautiful visualizations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Goal Tracking</h3>
                  <p className="text-coral-100">
                    Set meaningful budgets and watch your progress toward financial freedom
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Self-Hosted Privacy</h3>
                  <p className="text-coral-100">
                    Your financial data stays on your server - complete control and privacy guaranteed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
