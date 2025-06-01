import { TextArea } from './text-area';

export function TextAreaDemo() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Text Area Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="default"
              label="Default Text Area"
              placeholder="Enter your message..."
              helperText="This is a default text area"
            />
            <TextArea
              id="disabled"
              label="Disabled Text Area"
              placeholder="This is disabled"
              disabled
              helperText="This text area is disabled"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="small"
              label="Small"
              size="sm"
              placeholder="Small text area"
              helperText="Small size text area"
            />
            <TextArea
              id="medium"
              label="Medium (Default)"
              size="md"
              placeholder="Medium text area"
              helperText="Medium size text area"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="large"
              label="Large"
              size="lg"
              placeholder="Large text area"
              helperText="Large size text area"
            />
            <TextArea
              id="extra-large"
              label="Extra Large"
              size="xl"
              placeholder="Extra large text area"
              helperText="Extra large size text area"
            />
          </div>
        </div>

        {/* Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="coral"
              label="Coral Style"
              variant="coral"
              placeholder="Coral themed text area"
              helperText="Primary coral styling"
            />
            <TextArea
              id="sage"
              label="Sage Style"
              variant="sage"
              placeholder="Sage themed text area"
              helperText="Secondary sage styling"
            />
            <TextArea
              id="mist"
              label="Mist Style"
              variant="mist"
              placeholder="Mist themed text area"
              helperText="Tertiary mist styling"
            />
            <TextArea
              id="slate"
              label="Slate Style"
              variant="slate"
              placeholder="Slate themed text area"
              helperText="Ghost slate styling"
            />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="success"
              label="Success State"
              variant="success"
              placeholder="Success text area"
              helperText="✅ Successfully validated"
            />
            <TextArea
              id="info"
              label="Info State"
              variant="info"
              placeholder="Info text area"
              helperText="ℹ️ Additional information"
            />
            <TextArea
              id="warning"
              label="Warning State"
              variant="warning"
              placeholder="Warning text area"
              helperText="⚠️ Please review carefully"
            />
            <TextArea
              id="danger"
              label="Danger State"
              variant="danger"
              placeholder="Danger text area"
              helperText="🚨 Critical attention required"
            />
          </div>
        </div>

        {/* Error State */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error State</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="error"
              label="Text Area with Error"
              placeholder="This field has an error"
              errorText="This field is required"
            />
            <TextArea
              id="error-filled"
              label="Filled Error Field"
              placeholder="Field with error"
              defaultValue="Some invalid content"
              errorText="Content is not valid"
            />
          </div>
        </div>

        {/* Resize Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Resize Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="resize-none"
              label="No Resize"
              resize="none"
              placeholder="Cannot be resized"
              helperText="Resize is disabled"
            />
            <TextArea
              id="resize-y"
              label="Vertical Resize (Default)"
              resize="y"
              placeholder="Can be resized vertically"
              helperText="Vertical resize only"
            />
            <TextArea
              id="resize-x"
              label="Horizontal Resize"
              resize="x"
              placeholder="Can be resized horizontally"
              helperText="Horizontal resize only"
            />
            <TextArea
              id="resize-both"
              label="Both Directions"
              resize="both"
              placeholder="Can be resized in both directions"
              helperText="Resize in any direction"
            />
          </div>
        </div>

        {/* Financial Use Cases */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              id="transaction-note"
              label="Transaction Note"
              variant="coral"
              placeholder="Add a note for this transaction..."
              helperText="Optional note for your records"
            />
            <TextArea
              id="budget-description"
              label="Budget Description"
              variant="sage"
              placeholder="Describe your budget goals..."
              helperText="Help you remember your financial goals"
            />
            <TextArea
              id="expense-details"
              label="Expense Details"
              variant="mist"
              size="lg"
              placeholder="Provide detailed expense information..."
              helperText="Include receipts, purpose, and other relevant details"
            />
            <TextArea
              id="financial-notes"
              label="Financial Notes"
              variant="outline"
              placeholder="General financial notes..."
              helperText="Keep track of important financial information"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
