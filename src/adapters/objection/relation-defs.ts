import type { Model, RelationMapping, RelationMappings } from 'objection'
import type { RelationshipKind, RelationshipModel } from '../../model/model-domain'

/**
 * Metadata Objection needs at runtime, plus `Target` and `kind` so the query builder can derive
 * {@link RelationshipModel} without duplicating `join` / `modelClass`.
 */
export type RelationDefEntry<TargetCtor extends abstract new (...args: never[]) => object> = {
  mapping: RelationMapping<Model>
  Target: TargetCtor
  kind: RelationshipKind
}

/**
 * Builds relationship typings for the query builder (second `QueryBuilder` generic) from the same const used for
 * {@link toRelationMappings}.
 */
export type RelationshipsFromDefs<
  Source extends object,
  Defs extends Record<string, RelationDefEntry<abstract new (...args: never[]) => object>>
> = {
  [K in keyof Defs]: RelationshipModel<Source, InstanceType<Defs[K]['Target']>, Defs[K]['kind']>
}

/**
 * Drops `Target` and `kind`, returning a plain Objection {@link RelationMappings} object.
 */
export function toRelationMappings<
  T extends Record<string, RelationDefEntry<abstract new (...args: never[]) => object>>
>(defs: T): RelationMappings {
  const out: Record<string, RelationMapping<Model>> = {}
  for (const key of Object.keys(defs) as (keyof T & string)[]) {
    out[key] = defs[key].mapping
  }
  return out
}
