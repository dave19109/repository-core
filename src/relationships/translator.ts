import type { CanonicalRelationship } from './schema'

/**
 * Strategy interface: map a canonical relationship into an ORM-specific payload.
 * Implement once per ORM (Prisma fragment, Objection mapping, Sequelize `associate`, …).
 */
export interface RelationshipTranslator<TOutput> {
  translate(relationship: CanonicalRelationship): TOutput
}

/**
 * Registry of named translators (metadata-driven wiring without a single giant switch per consumer).
 */
export type RelationshipTranslatorRegistry<TMap extends Record<string, unknown>> = {
  [K in keyof TMap]: RelationshipTranslator<TMap[K]>
}
