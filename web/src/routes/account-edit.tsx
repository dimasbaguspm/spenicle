import { useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form, TextField } from '@/components/ui/form'
import { useAccounts, usePatchAccount } from '@/hooks/queries/use-accounts'

type AccountEditValues = {
  name: string
}

/** An account's name is the field a person owns; its kind and balance are the ledger's. */
export function AccountEditPage() {
  const { ref } = useParams({ from: '/accounts/$ref/edit' })
  const navigate = useNavigate()
  const held = useAccounts({ refs: ref, limit: 1 })
  const patch = usePatchAccount()

  const account = held.data?.accounts[0]
  const values = useMemo(
    () => (account === undefined ? undefined : { name: account.name }),
    [account],
  )

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Accounts', to: '/accounts' },
          { label: account?.name ?? 'Account', to: `/accounts/${ref}` },
          { label: 'Edit' },
        ]}
      />
      <Text as="h1" tone="display">
        Rename account
      </Text>

      {values === undefined ? null : (
        <Panel>
          <div className="p-5 sm:p-6">
            <PanelHead eyebrow={account?.kind ?? 'Account'} description="The name only." />
            <Form<AccountEditValues>
              className="mt-4"
              defaultValues={values}
              submitLabel="Save account"
              onCancel={() => void navigate({ to: '/accounts/$ref', params: { ref } })}
              onSubmit={(next) => {
                patch.mutate(
                  { ref, body: { name: next.name } },
                  {
                    onSuccess: () => {
                      void navigate({ to: '/accounts/$ref', params: { ref } })
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
