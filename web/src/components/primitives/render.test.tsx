import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

import { Accordion } from '@/components/primitives/accordion'
import { AngleSlider } from '@/components/primitives/angle-slider'
import { Avatar } from '@/components/primitives/avatar'
import { Button } from '@/components/primitives/button'
import { Carousel } from '@/components/primitives/carousel'
import { Checkbox } from '@/components/primitives/checkbox'
import { Clipboard } from '@/components/primitives/clipboard'
import { Collapsible } from '@/components/primitives/collapsible'
import { ColorPicker } from '@/components/primitives/color-picker'
import { Combobox } from '@/components/primitives/combobox'
import { DateInput } from '@/components/primitives/date-input'
import { DatePicker } from '@/components/primitives/date-picker'
import { DateTimeInput } from '@/components/primitives/date-time-input'
import { Dialog } from '@/components/primitives/dialog'
import { DownloadTrigger } from '@/components/primitives/download-trigger'
import { Drawer } from '@/components/primitives/drawer'
import { Editable } from '@/components/primitives/editable'
import { EmailInput } from '@/components/primitives/email-input'
import { Field } from '@/components/primitives/field'
import { Fieldset } from '@/components/primitives/fieldset'
import { FileUpload } from '@/components/primitives/file-upload'
import { FloatingPanel } from '@/components/primitives/floating-panel'
import { Highlight } from '@/components/primitives/highlight'
import { HoverCard } from '@/components/primitives/hover-card'
import { ImageCropper } from '@/components/primitives/image-cropper'
import { JsonTreeView } from '@/components/primitives/json-tree-view'
import { Listbox } from '@/components/primitives/listbox'
import { Marquee } from '@/components/primitives/marquee'
import { Menu } from '@/components/primitives/menu'
import { NavigationMenu } from '@/components/primitives/navigation-menu'
import { NumberInput } from '@/components/primitives/number-input'
import { Pagination } from '@/components/primitives/pagination'
import { PasswordInput } from '@/components/primitives/password-input'
import { PinInput } from '@/components/primitives/pin-input'
import { Popover } from '@/components/primitives/popover'
import { Progress } from '@/components/primitives/progress'
import { QrCode } from '@/components/primitives/qr-code'
import { RadioGroup } from '@/components/primitives/radio-group'
import { RatingGroup } from '@/components/primitives/rating-group'
import { ScrollArea } from '@/components/primitives/scroll-area'
import { SegmentGroup } from '@/components/primitives/segment-group'
import { SelectInput } from '@/components/primitives/select-input'
import { SignaturePad } from '@/components/primitives/signature-pad'
import { Slider } from '@/components/primitives/slider'
import { Splitter } from '@/components/primitives/splitter'
import { Steps } from '@/components/primitives/steps'
import { Swap } from '@/components/primitives/swap'
import { SwitchInput } from '@/components/primitives/switch-input'
import { Tabs } from '@/components/primitives/tabs'
import { TagsInput } from '@/components/primitives/tags-input'
import { Text } from '@/components/primitives/text'
import { TextAreaInput } from '@/components/primitives/text-area-input'
import { TextInput } from '@/components/primitives/text-input'
import { Timer } from '@/components/primitives/timer'
import { Toaster } from '@/components/primitives/toast'
import { Toc } from '@/components/primitives/toc'
import { Toggle } from '@/components/primitives/toggle'
import { ToggleGroup } from '@/components/primitives/toggle-group'
import { Tooltip } from '@/components/primitives/tooltip'
import { TreeView } from '@/components/primitives/tree-view'

const noop = () => {}

const options = [
  { label: 'Cash', value: 'cash' },
  { label: 'Bank', value: 'bank' },
]

const panels = [
  { id: 'left', content: 'left' },
  { id: 'right', content: 'right' },
]

const cases: { name: string; element: ReactElement }[] = [
  {
    name: 'Accordion',
    element: <Accordion items={[{ value: 'a', trigger: 'A', content: 'a' }]} />,
  },
  { name: 'AngleSlider', element: <AngleSlider value={45} onValueChange={noop} /> },
  { name: 'Avatar', element: <Avatar name="Ada Lovelace" /> },
  { name: 'Button', element: <Button type="button">Save</Button> },
  { name: 'Carousel', element: <Carousel items={[{ key: 'a', content: 'a' }]} /> },
  {
    name: 'Checkbox',
    element: <Checkbox checked={false} onCheckedChange={noop} label="Reconciled" />,
  },
  { name: 'Clipboard', element: <Clipboard value="spl_ab12" label="Token" /> },
  {
    name: 'Collapsible',
    element: <Collapsible trigger={<Button type="button">More</Button>}>x</Collapsible>,
  },
  { name: 'ColorPicker', element: <ColorPicker value="#b23a3f" onValueChange={noop} /> },
  { name: 'Combobox', element: <Combobox items={options} value="" onValueChange={noop} /> },
  { name: 'DateInput', element: <DateInput value="2026-02-14" onChange={noop} /> },
  { name: 'DatePicker', element: <DatePicker value="2026-02-14" onValueChange={noop} /> },
  { name: 'DateTimeInput', element: <DateTimeInput value="" onChange={noop} /> },
  {
    name: 'Dialog',
    element: (
      <Dialog trigger={<Button type="button">Open</Button>} title="New entry">
        body
      </Dialog>
    ),
  },
  {
    name: 'Drawer',
    element: (
      <Drawer label="Navigation" trigger={<Button type="button">Menu</Button>}>
        links
      </Drawer>
    ),
  },
  { name: 'Editable', element: <Editable value="Cash" onValueChange={noop} label="Account" /> },
  { name: 'EmailInput', element: <EmailInput value="" onChange={noop} /> },
  {
    name: 'Field',
    element: (
      <Field label="Amount" hint="Minor units">
        <TextInput value="" onChange={noop} />
      </Field>
    ),
  },
  { name: 'Fieldset', element: <Fieldset legend="Postings">rows</Fieldset> },
  { name: 'FileUpload', element: <FileUpload label="Statement" /> },
  { name: 'FloatingPanel', element: <FloatingPanel title="Filters">body</FloatingPanel> },
  { name: 'Highlight', element: <Highlight text="Groceries" query="groc" /> },
  {
    name: 'HoverCard',
    element: <HoverCard trigger={<Button type="button">What</Button>}>detail</HoverCard>,
  },
  { name: 'ImageCropper', element: <ImageCropper src="data:image/png;base64,iVBORw0KGgo=" /> },
  { name: 'JsonTreeView', element: <JsonTreeView data={{ balance: 1 }} /> },
  { name: 'Listbox', element: <Listbox items={options} value={[]} onValueChange={noop} /> },
  { name: 'Marquee', element: <Marquee>ticker</Marquee> },
  {
    name: 'Menu',
    element: (
      <Menu
        trigger={<Button type="button">Account</Button>}
        items={[{ label: 'Sign out', onSelect: noop }]}
      />
    ),
  },
  { name: 'NumberInput', element: <NumberInput value="1" onValueChange={noop} /> },
  {
    name: 'Pagination',
    element: <Pagination page={2} count={40} pageSize={10} onPageChange={noop} />,
  },
  { name: 'PasswordInput', element: <PasswordInput value="" onChange={noop} /> },
  { name: 'PinInput', element: <PinInput value={[]} onValueChange={noop} /> },
  {
    name: 'Popover',
    element: <Popover trigger={<Button type="button">Filters</Button>}>body</Popover>,
  },
  { name: 'Progress', element: <Progress value={40} /> },
  { name: 'Progress circle', element: <Progress value={40} shape="circle" /> },
  { name: 'QrCode', element: <QrCode value="spenicle" /> },
  {
    name: 'RadioGroup',
    element: <RadioGroup value="cash" options={options} onValueChange={noop} />,
  },
  { name: 'RatingGroup', element: <RatingGroup value={3} onValueChange={noop} /> },
  { name: 'ScrollArea', element: <ScrollArea>rows</ScrollArea> },
  {
    name: 'SegmentGroup',
    element: <SegmentGroup value="cash" options={options} onValueChange={noop} />,
  },
  {
    name: 'SelectInput',
    element: <SelectInput value="cash" options={options} onChange={noop} />,
  },
  { name: 'SignaturePad', element: <SignaturePad /> },
  { name: 'Slider', element: <Slider value={[30]} onValueChange={noop} /> },
  { name: 'Splitter', element: <Splitter panels={panels} /> },
  { name: 'Steps', element: <Steps step={0} items={[{ value: 'a', title: 'Review' }]} /> },
  {
    name: 'SwitchInput',
    element: <SwitchInput checked label="Automatic" onCheckedChange={noop} />,
  },
  {
    name: 'Tabs',
    element: (
      <Tabs value="a" items={[{ value: 'a', label: 'A', content: 'a' }]} onValueChange={noop} />
    ),
  },
  { name: 'TagsInput', element: <TagsInput value={['food']} onValueChange={noop} /> },
  {
    name: 'Text',
    element: (
      <Text as="h1" tone="display">
        Spenicle
      </Text>
    ),
  },
  { name: 'TextAreaInput', element: <TextAreaInput value="" onChange={noop} /> },
  { name: 'TextInput', element: <TextInput value="" onChange={noop} /> },
  { name: 'Timer', element: <Timer targetMs={60000} /> },
  { name: 'Toaster', element: <Toaster /> },
  { name: 'Toc', element: <Toc items={[{ value: 'a', label: 'A', url: '#a' }]} /> },
  { name: 'Toggle', element: <Toggle aria-label="Bold">B</Toggle> },
  {
    name: 'ToggleGroup',
    element: <ToggleGroup value={['a']} items={options} onValueChange={noop} />,
  },
  {
    name: 'Tooltip',
    element: (
      <Tooltip content="tip">
        <Button type="button">?</Button>
      </Tooltip>
    ),
  },
  { name: 'TreeView', element: <TreeView items={[{ value: 'a', label: 'A' }]} /> },
  {
    name: 'DownloadTrigger',
    element: (
      <DownloadTrigger data="occurred_on,amount_minor" fileName="rows.csv">
        Save
      </DownloadTrigger>
    ),
  },
  {
    name: 'NavigationMenu',
    element: <NavigationMenu items={[{ label: 'Ledger', href: '/ledger' }]} />,
  },
  {
    name: 'Swap',
    element: (
      <Swap swap={false}>
        <span>on</span>
        <span>off</span>
      </Swap>
    ),
  },
]

describe('components/ui', () => {
  it.each(cases)('$name renders', ({ element }) => {
    const { container } = render(element)

    expect(container.firstChild).not.toBeNull()
  })
})
