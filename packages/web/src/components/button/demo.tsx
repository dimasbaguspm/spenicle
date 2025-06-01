import { Heart, Plus, Settings, Trash2, Download, Upload, Save } from 'lucide-react';

import { Button, IconButton } from '.';

export function ButtonDemo() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Regular Buttons</h2>

        <div className="space-y-4">
          {/* Default Intent */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Default</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>

          {/* Disabled State */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Disabled</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" disabled>
                Primary
              </Button>
              <Button variant="secondary" disabled>
                Secondary
              </Button>
              <Button variant="outline" disabled>
                Outline
              </Button>
              <Button variant="ghost" disabled>
                Ghost
              </Button>
            </div>
          </div>

          {/* Busy State */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Busy State</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" busy>
                Saving...
              </Button>
              <Button variant="secondary" busy>
                Loading...
              </Button>
              <Button variant="outline" busy>
                Processing...
              </Button>
              <Button variant="ghost" busy>
                Submitting...
              </Button>
            </div>
          </div>

          {/* With Icons */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">With Icons</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" iconLeft={<Download className="h-4 w-4" />}>
                Download
              </Button>
              <Button variant="secondary" iconRight={<Upload className="h-4 w-4" />}>
                Upload
              </Button>
              <Button
                variant="outline"
                iconLeft={<Save className="h-4 w-4" />}
                iconRight={<Heart className="h-4 w-4" />}
              >
                Save & Like
              </Button>
            </div>
          </div>

          {/* Error Intent */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Error</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="error">Error</Button>
              <Button variant="error-outline">Error Outline</Button>
              <Button variant="error-ghost">Error Ghost</Button>
              <Button variant="error" disabled>
                Error Disabled
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Icon Buttons</h2>

        <div className="space-y-4">
          {/* Default Intent */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Default</h3>
            <div className="flex flex-wrap gap-2">
              <IconButton size="sm">
                <Plus className="h-4 w-4" />
              </IconButton>
              <IconButton size="md">
                <Plus className="h-5 w-5" />
              </IconButton>
              <IconButton size="lg">
                <Plus className="h-6 w-6" />
              </IconButton>
              <IconButton size="xl">
                <Plus className="h-7 w-7" />
              </IconButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <IconButton variant="default">
                <Heart className="h-5 w-5" />
              </IconButton>
              <IconButton variant="secondary">
                <Settings className="h-5 w-5" />
              </IconButton>
              <IconButton variant="outline">
                <Plus className="h-5 w-5" />
              </IconButton>
              <IconButton variant="ghost">
                <Settings className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          {/* Disabled State */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Disabled</h3>
            <div className="flex flex-wrap gap-2">
              <IconButton variant="default" disabled>
                <Heart className="h-5 w-5" />
              </IconButton>
              <IconButton variant="secondary" disabled>
                <Settings className="h-5 w-5" />
              </IconButton>
              <IconButton variant="outline" disabled>
                <Plus className="h-5 w-5" />
              </IconButton>
              <IconButton variant="ghost" disabled>
                <Settings className="h-5 w-5" />
              </IconButton>
            </div>
          </div>

          {/* Error Intent */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Error</h3>
            <div className="flex flex-wrap gap-2">
              <IconButton variant="error">
                <Trash2 className="h-5 w-5" />
              </IconButton>
              <IconButton variant="error-outline">
                <Trash2 className="h-5 w-5" />
              </IconButton>
              <IconButton variant="error-ghost">
                <Trash2 className="h-5 w-5" />
              </IconButton>
              <IconButton variant="error" disabled>
                <Trash2 className="h-5 w-5" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
