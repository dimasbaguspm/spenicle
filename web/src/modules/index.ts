/**
 * One folder per entity. A module owns everything a screen needs to say about its entity — the
 * component, the fallbacks, the flags and the tone — so a route composes modules and never reads
 * a field to decide how a row looks. Each folder keeps one component per file and re-exports it
 * from its own `index.ts`.
 */
export * from './account'
export * from './analytics'
export * from './audit'
export * from './capture'
export * from './entry'
export * from './export'
export * from './month'
export * from './recurring'
export * from './payee'
export * from './settings'
export * from './token'
