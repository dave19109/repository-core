import { type Model, Model as ObjectionModel, type RelationMapping, type RelationMappings } from 'objection'
import type { CanonicalRelationship } from '../../relationships/schema'
import type { RelationDefEntry } from './relation-defs'

/**
 * Resolves logical entity ids from {@link CanonicalRelationship} to Objection model classes.
 */
export type ObjectionModelResolver = (entityName: string) => typeof Model

export type ObjectionResolveContext = {
  resolveModel: ObjectionModelResolver
}

/**
 * Translates a canonical relationship into Objection's {@link RelationMapping}.
 */
export function canonicalToObjectionRelationMapping(
  rel: CanonicalRelationship,
  ctx: ObjectionResolveContext
): RelationMapping<Model> {
  const target = ctx.resolveModel(rel.targetEntity)

  switch (rel.kind) {
    case 'manyToOne':
      return {
        relation: ObjectionModel.BelongsToOneRelation,
        modelClass: target,
        join: {
          from: rel.foreignKey.from,
          to: rel.foreignKey.to
        }
      }
    case 'oneToMany':
      return {
        relation: ObjectionModel.HasManyRelation,
        modelClass: target,
        join: {
          from: rel.foreignKey.from,
          to: rel.foreignKey.to
        }
      }
    case 'oneToOne':
      if (rel.foreignKeyOwner === 'source') {
        return {
          relation: ObjectionModel.BelongsToOneRelation,
          modelClass: target,
          join: {
            from: rel.foreignKey.from,
            to: rel.foreignKey.to
          }
        }
      }
      return {
        relation: ObjectionModel.HasOneRelation,
        modelClass: target,
        join: {
          from: rel.foreignKey.from,
          to: rel.foreignKey.to
        }
      }
    case 'manyToMany': {
      const { junction } = rel
      const throughModel = junction.throughEntity ? ctx.resolveModel(junction.throughEntity) : undefined
      return {
        relation: ObjectionModel.ManyToManyRelation,
        modelClass: target,
        join: {
          from: junction.sourceToJunction.from,
          through: {
            from: junction.sourceToJunction.to,
            to: junction.junctionToTarget.from,
            ...(throughModel !== undefined ? { modelClass: throughModel } : {})
          },
          to: junction.junctionToTarget.to
        }
      }
    }
  }
}

/**
 * Builds a {@link RelationDefEntry} usable with {@link toRelationMappings} and typing the query builder relationship map.
 */
export function relationDefFromCanonical<TargetCtor extends abstract new (...args: never[]) => object>(
  rel: CanonicalRelationship,
  Target: TargetCtor,
  ctx: ObjectionResolveContext
): RelationDefEntry<TargetCtor> {
  return {
    mapping: canonicalToObjectionRelationMapping(rel, ctx),
    Target,
    kind: rel.kind
  }
}

/**
 * Builds full Objection {@link RelationMappings} from canonical definitions and a model resolver.
 */
export function relationMappingsFromCanonical(
  defs: Record<string, { canonical: CanonicalRelationship }>,
  ctx: ObjectionResolveContext
): RelationMappings {
  const out: Record<string, RelationMapping<Model>> = {}
  for (const key of Object.keys(defs)) {
    out[key] = canonicalToObjectionRelationMapping(defs[key].canonical, ctx)
  }
  return out
}
