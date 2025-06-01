import { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonCard } from '.';

export function SkeletonDemo() {
  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skeleton Loading States</h2>

        <div className="space-y-8">
          {/* Basic Shapes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Basic Shapes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Rectangle</p>
                <Skeleton shape="rectangle" size="lg" width="full" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Square</p>
                <Skeleton shape="square" size="lg" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Circle</p>
                <Skeleton shape="circle" size="lg" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Pill</p>
                <Skeleton shape="pill" size="md" width="lg" />
              </div>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Sizes</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">XS</span>
                <Skeleton size="xs" width="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">SM</span>
                <Skeleton size="sm" width="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">MD</span>
                <Skeleton size="md" width="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">LG</span>
                <Skeleton size="lg" width="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">XL</span>
                <Skeleton size="xl" width="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">2XL</span>
                <Skeleton size="2xl" width="md" />
              </div>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Color Variants</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Core Colors</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs">Default (Mist)</span>
                    <Skeleton variant="default" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Coral</span>
                    <Skeleton variant="coral" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Sage</span>
                    <Skeleton variant="sage" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Slate</span>
                    <Skeleton variant="slate" size="md" width="full" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">Semantic Colors</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs">Success</span>
                    <Skeleton variant="success" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Info</span>
                    <Skeleton variant="info" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Warning</span>
                    <Skeleton variant="warning" size="md" width="full" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs">Danger</span>
                    <Skeleton variant="danger" size="md" width="full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compound Components */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Compound Components</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Avatar Skeletons</p>
                <div className="flex items-center gap-3">
                  <SkeletonAvatar size="sm" />
                  <SkeletonAvatar size="md" />
                  <SkeletonAvatar size="lg" />
                  <SkeletonAvatar size="xl" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-gray-500">Button Skeletons</p>
                <div className="flex flex-wrap gap-2">
                  <SkeletonButton size="sm" width="sm" />
                  <SkeletonButton size="md" width="md" />
                  <SkeletonButton size="lg" width="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Skeletons */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Text Skeletons</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Paragraph Loading</p>
                <div className="space-y-2">
                  <SkeletonText width="full" />
                  <SkeletonText width="3/4" />
                  <SkeletonText width="1/2" />
                  <SkeletonText width="2/3" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">Various Widths</p>
                <div className="space-y-2">
                  <SkeletonText width="1/4" />
                  <SkeletonText width="1/3" />
                  <SkeletonText width="1/2" />
                  <SkeletonText width="2/3" />
                  <SkeletonText width="3/4" />
                  <SkeletonText width="full" />
                </div>
              </div>
            </div>
          </div>

          {/* Card Skeletons */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Card Skeletons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard size="2xl" variant="mist" />
              <SkeletonCard size="3xl" variant="sage" />
            </div>
          </div>

          {/* Animation States */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Animation States</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Animated (Default)</p>
                <Skeleton size="lg" width="full" animated={true} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Static</p>
                <Skeleton size="lg" width="full" animated={false} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">No Shimmer</p>
                <Skeleton size="lg" width="full" shimmer={false} />
              </div>
            </div>
          </div>

          {/* Real-world Examples */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Real-world Examples</h3>

            {/* Profile Card Loading */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Profile Card Loading</p>
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <SkeletonAvatar size="lg" />
                  <div className="space-y-2 flex-1">
                    <SkeletonText width="1/3" />
                    <SkeletonText width="1/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <SkeletonText width="full" />
                  <SkeletonText width="3/4" />
                  <SkeletonText width="1/2" />
                </div>
                <div className="flex gap-2">
                  <SkeletonButton size="sm" width="sm" />
                  <SkeletonButton size="sm" width="sm" variant="sage" />
                </div>
              </div>
            </div>

            {/* Transaction List Loading */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Transaction List Loading</p>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton shape="circle" size="md" variant="coral" />
                      <div className="space-y-1">
                        <SkeletonText width="md" />
                        <SkeletonText width="sm" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <SkeletonText width="sm" />
                      <SkeletonText width="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Cards Loading */}
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Dashboard Cards Loading</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <SkeletonText width="1/2" />
                      <Skeleton shape="circle" size="sm" />
                    </div>
                    <Skeleton size="xl" width="3/4" variant="success" />
                    <SkeletonText width="1/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
