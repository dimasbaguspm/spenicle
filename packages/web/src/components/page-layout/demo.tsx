import { Button } from '../button';
import { TopNav } from '../top-nav';

import { PageLayout, PageLayoutHeader, PageLayoutMain, PageLayoutFooter } from './page-layout';

export function PageLayoutDemo() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Page Layout Component</h2>
        <p className="text-slate-600 mb-8">
          A flexible layout component that manages viewport height, full width, and provides consistent page structure
          with header, main content, and footer areas.
        </p>
      </div>

      <div className="space-y-8">
        {/* Basic Layout */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Basic Layout</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <PageLayout
              minHeight="full"
              background="sage"
              header={
                <div className="bg-white border-b border-gray-200 p-4">
                  <h1 className="text-xl font-semibold text-slate-700">Header Content</h1>
                </div>
              }
              footer={
                <div className="bg-gray-50 border-t border-gray-200 p-4 text-center">
                  <p className="text-sm text-slate-500">Footer Content</p>
                </div>
              }
              mainProps={{ padding: 'lg' }}
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Main Content Area</h2>
                  <p className="text-slate-500">This content fills the available space between header and footer</p>
                </div>
              </div>
            </PageLayout>
          </div>
        </div>

        {/* With TopNav */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">With Top Navigation</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <PageLayout
              minHeight="full"
              background="white"
              header={
                <TopNav
                  menuItems={[
                    { label: 'Dashboard', href: '/dashboard', active: true },
                    { label: 'Transactions', href: '/transactions' },
                    { label: 'Budget', href: '/budget' },
                    { label: 'Reports', href: '/reports' },
                  ]}
                  avatarSrc="https://picsum.photos/32/32"
                />
              }
              headerProps={{
                sticky: true,
                shadow: 'sm',
                background: 'white',
              }}
              mainProps={{ padding: 'lg' }}
            >
              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-slate-700">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-coral-50 border border-coral-200 rounded-lg p-6">
                    <h3 className="font-semibold text-coral-700 mb-2">Total Balance</h3>
                    <p className="text-2xl font-bold text-coral-600">$12,345.67</p>
                  </div>
                  <div className="bg-sage-50 border border-sage-200 rounded-lg p-6">
                    <h3 className="font-semibold text-sage-700 mb-2">Monthly Spending</h3>
                    <p className="text-2xl font-bold text-sage-600">$2,134.89</p>
                  </div>
                  <div className="bg-mist-50 border border-mist-200 rounded-lg p-6">
                    <h3 className="font-semibold text-mist-700 mb-2">Savings Goal</h3>
                    <p className="text-2xl font-bold text-mist-600">$5,000.00</p>
                  </div>
                </div>
              </div>
            </PageLayout>
          </div>
        </div>

        {/* Constrained Width */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Constrained Max Width</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
            <PageLayout
              minHeight="full"
              background="mist"
              maxWidth="4xl"
              header={
                <div className="bg-white border-b border-gray-200 p-4 text-center">
                  <h1 className="text-xl font-semibold text-slate-700">Centered Layout</h1>
                </div>
              }
              mainProps={{ padding: 'lg' }}
            >
              <div className="bg-white rounded-lg border border-mist-200 p-6">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Content Container</h2>
                <p className="text-slate-600 mb-4">
                  This layout has a maximum width constraint and is centered on the page. This is useful for content
                  that shouldn't stretch too wide on large screens.
                </p>
                <Button variant="coral">Take Action</Button>
              </div>
            </PageLayout>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Scrollable Content</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <PageLayout
              minHeight="full"
              background="sage"
              header={
                <div className="bg-white border-b border-gray-200 p-4">
                  <h1 className="text-xl font-semibold text-slate-700">Scrollable Content Demo</h1>
                </div>
              }
              headerProps={{ sticky: true, background: 'white', shadow: 'sm' }}
              mainProps={{ padding: 'lg', overflow: 'auto' }}
            >
              <div className="space-y-4">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-sage-200 p-4">
                    <h3 className="font-semibold text-slate-700">Item {i + 1}</h3>
                    <p className="text-slate-500 mt-2">
                      This is content item {i + 1}. The main content area is scrollable while the header remains sticky
                      at the top.
                    </p>
                  </div>
                ))}
              </div>
            </PageLayout>
          </div>
        </div>

        {/* Composable Version */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Composable Components</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
            <PageLayout minHeight="full" background="cream">
              <PageLayoutHeader sticky background="white" shadow="sm">
                <div className="p-4 flex justify-between items-center">
                  <h1 className="text-xl font-semibold text-slate-700">Custom Header</h1>
                  <Button variant="coral" size="sm">
                    Action
                  </Button>
                </div>
              </PageLayoutHeader>

              <PageLayoutMain padding="lg" className="bg-cream-50">
                <div className="bg-white rounded-lg border border-cream-200 p-6 h-full flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-700 mb-2">Composable Layout</h2>
                    <p className="text-slate-500">
                      Use individual components for more control over the layout structure
                    </p>
                  </div>
                </div>
              </PageLayoutMain>

              <PageLayoutFooter background="white" className="border-t border-gray-200">
                <div className="p-4 flex justify-between items-center">
                  <p className="text-sm text-slate-500">© 2025 Spendless App</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Help
                    </Button>
                    <Button variant="sage" size="sm">
                      Settings
                    </Button>
                  </div>
                </div>
              </PageLayoutFooter>
            </PageLayout>
          </div>
        </div>

        {/* Viewport Height Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Viewport Height Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Min Height: Screen</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden h-32">
                <PageLayout minHeight="screen" background="coral" className="text-center text-coral-700 font-medium">
                  min-h-screen
                </PageLayout>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Min Height: Viewport</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden h-32">
                <PageLayout minHeight="viewport" background="sage" className="text-center text-sage-700 font-medium">
                  min-h-[100vh]
                </PageLayout>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Height: Full</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden h-32">
                <PageLayout minHeight="full" background="mist" className="text-center text-mist-700 font-medium">
                  h-screen
                </PageLayout>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Height: Auto</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden h-32">
                <PageLayout minHeight="auto" background="slate" className="text-center text-slate-700 font-medium">
                  min-h-0
                </PageLayout>
              </div>
            </div>
          </div>
        </div>

        {/* Features Summary */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">✨ Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Layout Management</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Full width by default</li>
                <li>• Configurable viewport height handling</li>
                <li>• Flexible header, main, and footer areas</li>
                <li>• Sticky header and footer support</li>
                <li>• Scrollable main content area</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Customization</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Multiple background color options</li>
                <li>• Responsive max-width constraints</li>
                <li>• Configurable padding and spacing</li>
                <li>• Shadow and border effects</li>
                <li>• Composable sub-components</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
