import { useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form, TextField } from '@/components/ui/form'
import { useAccounts, usePatchAccount } from '@/hooks/queries/use-accounts'

type AccountEditValues = {
  name: string
}

type RenameProps = {
  accountRef: string
  listLabel: string
  listTo: '/accounts' | '/categories'
  detailTo: '/accounts/$ref' | '/categories/$ref'
}

/** An account's name is the field a person owns; its kind and balance are the ledger's. */
export function AccountEditPage() {
  const { ref } = useParams({ from: '/accounts/$ref/edit' })

  return (
    <RenameAccount
      accountRef={ref}
      listLabel="Accounts"
      listTo="/accounts"
      detailTo="/accounts/$ref"
    />
  )
}

export function CategoryEditPage() {
  const { ref } = useParams({ from: '/categories/$ref/edit' })

  return (
    <RenameAccount
      accountRef={ref}
      listLabel="Categories"
      listTo="/categories"
      detailTo="/categories/$ref"
    />
  )
}

/** A category is an account, so renaming one is the same form with a different trail home. */
function RenameAccount({ accountRef, listLabel, listTo, detailTo }: RenameProps) {
  const navigate = useNavigate()
  const held = useAccounts({ refs: accountRef, limit: 1 })
  const patch = usePatchAccount()

  const account = held.data?.accounts[0]
  const values = useMemo(
    () => (account === undefined ? undefined : { name: account.name }),
    [account],
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        items={[
          { label: listLabel, to: listTo },
          { label: account?.name ?? 'Account', to: `${listTo}/${accountRef}` },
          { label: 'Edit' },
        ]}
        title="Rename"
      />

      {values === undefined ? null : (
        <Panel>
          <div className="p-5 sm:p-6">
            <PanelHead eyebrow={account?.kind ?? 'Account'} description="The name only." />
            <Form<AccountEditValues>
              className="mt-4"
              defaultValues={values}
              submitLabel="Save"
              onCancel={() => void navigate({ to: detailTo, params: { ref: accountRef } })}
              onSubmit={(next) => {
                patch.mutate(
                  { ref: accountRef, body: { name: next.name } },
                  {
                    onSuccess: () => {
                      void navigate({ to: detailTo, params: { ref: accountRef } })
                    },
                  },
                )
              }}
            >
              {() => <TextField<AccountEditValues> name="name" label="Name" />}
            </Form>
            {patch.error === null ? null : (
              <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
                {patch.error.message}
              </Text>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
