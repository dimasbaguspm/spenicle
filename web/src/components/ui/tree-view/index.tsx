import { createTreeCollection, TreeView as ArkTreeView } from '@ark-ui/react/tree-view'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { Text } from '@/components/ui/text'

type TreeNode = {
  value: string
  label: string
  children?: TreeNode[]
}

type TreeViewProps = {
  items: TreeNode[]
  value?: string[] | undefined
  onValueChange?: (value: string[]) => void
}

const row =
  'group text-text-muted hover:text-porcelain-50 flex items-center gap-1 rounded px-2 py-1 text-sm data-[selected]:bg-primary-soft data-[selected]:text-porcelain-50 data-[focus]:ring-accent/40 data-[focus]:ring-1 data-[focus]:outline-none'

/** Ark owns the tree model, the roving focus and the selection; the recursion and the palette are ours. */
export function TreeView({ items, value, onValueChange }: TreeViewProps) {
  const collection = createTreeCollection<TreeNode>({
    rootNode: { value: '__root__', label: '', children: items },
    nodeToValue: (node) => node.value,
    nodeToString: (node) => node.label,
  })

  return (
    <ArkTreeView.Root
      collection={collection}
      selectedValue={value}
      onSelectionChange={(details) => {
        onValueChange?.(details.selectedValue)
      }}
      className="min-w-0"
    >
      <ArkTreeView.Tree className="space-y-0.5">{renderNodes(items, [])}</ArkTreeView.Tree>
    </ArkTreeView.Root>
  )
}

function childPath(parent: number[], index: number): number[] {
  return [...parent, index]
}

function renderNodes(nodes: TreeNode[], indexPath: number[]): ReactNode {
  return nodes.map((node, index) => {
    const path = childPath(indexPath, index)
    const children = node.children

    return (
      <ArkTreeView.NodeProvider key={node.value} node={node} indexPath={path}>
        {children === undefined || children.length === 0 ? (
          <ArkTreeView.Item className={row}>
            <ArkTreeView.ItemText asChild>
              <Text as="span" tone="body" className="truncate">
                {node.label}
              </Text>
            </ArkTreeView.ItemText>
          </ArkTreeView.Item>
        ) : (
          <ArkTreeView.Branch>
            <ArkTreeView.BranchControl className={row}>
              <ArkTreeView.BranchIndicator className="text-ink-400 transition-transform data-[state=open]:rotate-90">
                <ChevronRight className="size-4" aria-hidden="true" strokeWidth={1.75} />
              </ArkTreeView.BranchIndicator>
              <ArkTreeView.BranchText asChild>
                <Text as="span" tone="body" className="truncate">
                  {node.label}
                </Text>
              </ArkTreeView.BranchText>
            </ArkTreeView.BranchControl>
            <ArkTreeView.BranchContent className="border-border relative ml-3 border-l pl-2">
              {renderNodes(children, path)}
            </ArkTreeView.BranchContent>
          </ArkTreeView.Branch>
        )}
      </ArkTreeView.NodeProvider>
    )
  })
}
