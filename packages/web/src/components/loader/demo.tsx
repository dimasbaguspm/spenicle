import { Loader } from '.';

export function LoaderDemo() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-6">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Loader Components</h2>

      <div className="space-y-8">
        {/* Sizes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Sizes</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-center">
              <Loader size="xs" />
              <p className="text-xs text-slate-500 mt-1">XS</p>
            </div>
            <div className="text-center">
              <Loader size="sm" />
              <p className="text-xs text-slate-500 mt-1">SM</p>
            </div>
            <div className="text-center">
              <Loader size="md" />
              <p className="text-xs text-slate-500 mt-1">MD</p>
            </div>
            <div className="text-center">
              <Loader size="lg" />
              <p className="text-xs text-slate-500 mt-1">LG</p>
            </div>
            <div className="text-center">
              <Loader size="xl" />
              <p className="text-xs text-slate-500 mt-1">XL</p>
            </div>
            <div className="text-center">
              <Loader size="2xl" />
              <p className="text-xs text-slate-500 mt-1">2XL</p>
            </div>
          </div>
        </div>

        {/* Core Variants */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Core Color Variants</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-center">
              <Loader variant="coral" />
              <p className="text-xs text-slate-500 mt-1">Coral</p>
            </div>
            <div className="text-center">
              <Loader variant="sage" />
              <p className="text-xs text-slate-500 mt-1">Sage</p>
            </div>
            <div className="text-center">
              <Loader variant="mist" />
              <p className="text-xs text-slate-500 mt-1">Mist</p>
            </div>
            <div className="text-center">
              <Loader variant="slate" />
              <p className="text-xs text-slate-500 mt-1">Slate</p>
            </div>
            <div className="text-center">
              <Loader variant="cream" />
              <p className="text-xs text-slate-500 mt-1">Cream</p>
            </div>
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Semantic Variants</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-center">
              <Loader variant="success" />
              <p className="text-xs text-slate-500 mt-1">Success</p>
            </div>
            <div className="text-center">
              <Loader variant="info" />
              <p className="text-xs text-slate-500 mt-1">Info</p>
            </div>
            <div className="text-center">
              <Loader variant="warning" />
              <p className="text-xs text-slate-500 mt-1">Warning</p>
            </div>
            <div className="text-center">
              <Loader variant="danger" />
              <p className="text-xs text-slate-500 mt-1">Danger</p>
            </div>
          </div>
        </div>

        {/* With Text - Right Position */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">With Text (Right Position)</h3>
          <div className="space-y-3">
            <Loader variant="coral" text="Loading..." />
            <Loader variant="sage" text="Processing payment..." size="sm" />
            <Loader variant="info" text="Updating account..." />
            <Loader variant="warning" text="Checking balance..." />
          </div>
        </div>

        {/* With Text - Bottom Position */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">With Text (Bottom Position)</h3>
          <div className="flex flex-wrap items-start gap-6">
            <Loader variant="coral" text="Loading..." textPosition="bottom" size="lg" />
            <Loader variant="sage" text="Processing..." textPosition="bottom" size="lg" />
            <Loader variant="mist" text="Updating..." textPosition="bottom" size="lg" />
            <Loader variant="slate" text="Saving..." textPosition="bottom" size="lg" />
          </div>
        </div>

        {/* Financial App Use Cases */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-sage-50 rounded-lg border border-sage-200">
              <Loader variant="sage" text="Processing transaction..." />
            </div>
            <div className="p-4 bg-coral-50 rounded-lg border border-coral-200">
              <Loader variant="coral" text="Updating balance..." />
            </div>
            <div className="p-4 bg-info-50 rounded-lg border border-info-200">
              <Loader variant="info" text="Syncing account data..." />
            </div>
            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <Loader variant="warning" text="Verifying payment..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
