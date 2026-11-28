import { useNavigate } from '@tanstack/react-router'
import { Schema } from 'effect'
import type { Resolver } from 'react-hook-form'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form, SelectField, TextField } from '@/components/ui/form'
import { useCreateAccount } from '@/hooks/queries/use-accounts'
import { defaultKind, kindOptions, type AccountScope } from '@/modules'

const AccountForm = Schema.Struct({
  name: Schema.NonEmptyString,
  kind: Schema.NonEmptyString,
})

type AccountFormValues = typeof AccountForm.Type

const resolver: Resolver<AccountFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(AccountForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

/** An account holds money; a category says what money was for. Both are rows of the same kind. */
export function NewAccountPage() {
  return (
    <ScopeCreate
      scope="money"
      title="New account"
      listLabel="Accounts"
      desc="An asset, a liability or equity. Its balance is filled in by the entries that touch it."
    />
  )
}

export function NewCategoryPage() {
  return (
    <ScopeCreate
      scope="category"
      title="New category"
      listLabel="Categories"
      desc="A category never holds money: it names what a payment was for, and it is the other side of every entry."
    />
  )
}

function ScopeCreate({
  scope,
  title,
  listLabel,
  desc,
}: {
  scope: AccountScope
  title: string
  listLabel: string
  desc: string
}) {
  const navigate = useNavigate()
  const create = useCreateAccount()
  const detail = scope === 'category' ? '/manage/categories/$ref' : '/manage/accounts/$ref'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          {
            label: listLabel,
            to: scope === 'category' ? '/manage/categories' : '/manage/accounts',
          },
          { label: title },
        ]}
        title={title}
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead eyebrow={listLabel} description={desc} />
          <Form<AccountFormValues>
            className="mt-4"
            defaultValues={{ name: '', kind: defaultKind(scope) }}
            resolver={resolver}
            submitLabel={scope === 'category' ? 'Create category' : 'Create account'}
            onCancel={() =>
              void navigate({
                to: scope === 'category' ? '/manage/categories' : '/manage/accounts',
              })
            }
            onSubmit={(next) => {
              create.mutate(
                { name: next.name, kind: next.kind },
                {
                  onSuccess: (created) => {
                    void navigate({ to: detail, params: { ref: created.ref } })
                  },
                },
              )
            }}
          >
            {() => (
              <>
                <TextField<AccountFormValues> name="name" label="Name" placeholder="Groceries" />
                <SelectField<AccountFormValues>
                  name="kind"
                  label="Kind"
                  options={kindOptions(scope)}
                />
              </>
            )}
          </Form>
          {create.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {create.error.message}
            </Text>
          )}
        </div>
      </Panel>
    </div>
  )
}
