import type { RelationshipKind, RelationshipModel } from '../model/model-domain'

/**
 * Fully qualified column reference (`table.column`), ORM-neutral.
 * Matches SQL JOIN and Objection/Prisma field wiring without binding to one ORM.
 */
export type ColumnRef = string

/** Directed join between two columns (FK-style). */
export type JoinKey = {
  from: ColumnRef
  to: ColumnRef
}

type CanonicalRelationshipBase = {
  /** Stable logical name of the relationship on the source side (query builder / APIs). */
  name: string
  /** Logical entity id for the source (resolver maps this to tables/classes). */
  sourceEntity: string
  /** Logical entity id for the related side. */
  targetEntity: string
}

/** FK on the "many" side points to the "one" side (e.g. Post -> User). */
export type ManyToOneRelationshipSpec = CanonicalRelationshipBase & {
  kind: 'manyToOne'
  foreignKey: JoinKey
}

/** FK on the "many" side lives on the target rows (e.g. User -> Post[]). */
export type OneToManyRelationshipSpec = CanonicalRelationshipBase & {
  kind: 'oneToMany'
  foreignKey: JoinKey
}

/** Optional 1:1; `foreignKeyOwner` selects BelongsToOne vs HasOne in Objection-like ORMs. */
export type OneToOneRelationshipSpec = CanonicalRelationshipBase & {
  kind: 'oneToOne'
  foreignKey: JoinKey
  /** Side that owns the FK column in storage. */
  foreignKeyOwner: 'source' | 'target'
}

/**
 * M:N via a junction table. `sourceToJunction` and `junctionToTarget` must chain:
 * source row -> junction -> target row (Objection maps them to `join.from` / `through` / `to`).
 */
export type ManyToManyRelationshipSpec = CanonicalRelationshipBase & {
  kind: 'manyToMany'
  junction: {
    /** Optional: logical id for a join-table model (Objection `through.modelClass`). */
    throughEntity?: string
    sourceToJunction: JoinKey
    junctionToTarget: JoinKey
  }
}

/**
 * ORM-neutral relationship description: one discriminated union for all cardinalities.
 * Adapters translate this into Prisma schema, Objection `RelationMapping`, TypeORM metadata, etc.
 */
export type CanonicalRelationship =
  | ManyToOneRelationshipSpec
  | OneToManyRelationshipSpec
  | OneToOneRelationshipSpec
  | ManyToManyRelationshipSpec

/**
 * Maps a canonical relationship spec (e.g. `typeof myRel` with `satisfies CanonicalRelationship`)
 * to {@link RelationshipModel} for use as values in the relationship map (second `QueryBuilder` generic).
 */
export type RelationshipModelFromCanonical<
  Source extends object,
  Target extends object,
  C extends CanonicalRelationship
> = RelationshipModel<Source, Target, C['kind']>

/** Re-export for consumers that only import from `relationships`. */
export type { RelationshipKind }
