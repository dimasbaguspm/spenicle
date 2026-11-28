import { JsonTreeView as ArkJsonTreeView } from '@ark-ui/react/json-tree-view'

type JsonTreeViewProps = {
  data: unknown
  expandDepth?: number
}

/** Ark owns the JSON model, the expansion depth and the a11y labels; the token colours are ours. */
export function JsonTreeView({ data, expandDepth = 1 }: JsonTreeViewProps) {
  return (
    <ArkJsonTreeView.Root
      data={data}
      defaultExpandedDepth={expandDepth}
      className="text-text [&_[data-kind=key]]:text-accent [&_[data-kind=string]]:text-success [&_[data-kind=number]]:text-tertiary [&_[data-kind=boolean]]:text-warning [&_[data-kind=null]]:text-text-muted min-w-0"
    >
      <ArkJsonTreeView.Tree indentGuide className="font-mono text-xs leading-5" />
    </ArkJsonTreeView.Root>
  )
}
