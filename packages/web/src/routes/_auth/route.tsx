import { Brand, Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { BarChart3, Shield, TrendingUp } from 'lucide-react';

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
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/90 relative overflow-hidden">
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
              <div className="flex flex-row gap-4 items-center mb-4 bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                <Brand size="lg" name="spenicle" />
                <Text as="h2" fontSize="3xl" fontWeight="bold" className="text-white">
                  Spenicle
                </Text>
              </div>
              <Text as="p" fontSize="lg" fontWeight="medium" className="text-white">
                Take control of your financial future with intelligent expense tracking
              </Text>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon as={BarChart3} size="md" color="neutral" />
                </div>
                <div>
                  <Text as="h3" fontSize="lg" fontWeight="semibold" className="text-white">
                    Smart Analytics
                  </Text>
                  <Text className="text-white">
                    Discover spending patterns with intelligent insights and beautiful visualizations
                  </Text>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon as={TrendingUp} size="md" color="neutral" />
                </div>
                <div>
                  <Text as="h3" fontSize="lg" fontWeight="semibold" className="text-white">
                    Goal Tracking
                  </Text>
                  <Text className="text-white">
                    Set meaningful budgets and watch your progress toward financial freedom
                  </Text>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon as={Shield} size="md" color="neutral" />
                </div>
                <div>
                  <Text as="h3" fontSize="lg" fontWeight="semibold" className="text-white">
                    Self-Hosted Privacy
                  </Text>
                  <Text className="text-white">
                    Your financial data stays on your server - complete control and privacy guaranteed
                  </Text>
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
    <div className="flex justify-center p-4 items-start mt-[10vh]">
      <div className="w-full max-w-md space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
