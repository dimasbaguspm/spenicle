// @ts-expect-error is to assert the type of the function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function typeAssertion<T extends void>() {}
export type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
