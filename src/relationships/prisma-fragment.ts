import type { CanonicalRelationship } from './schema'

/** Fully qualified column reference (`table.column`). */
type ColumnRef = string

/**
 * Structured Prisma relation wiring (no `@prisma/client` dependency).
 * Can be turned into `.prisma` text or used by a code generator.
 */
export type PrismaRelationFieldSpec =
  | {
      cardinality: 'manyToOne' | 'oneToOne'
      /** Prisma model name of the related entity, e.g. `Person` */
      relatedModel: string
      /** Local FK field names on the source model */
      fields: string[]
      /** Referenced field names on the related model */
      references: string[]
      optional?: boolean
      /** True when the FK column lives on the related model (source side has no FK fields). */
      inverseSideOwnsForeignKey?: boolean
    }
  | {
      cardinality: 'oneToMany'
      relatedModel: string
      /** Back-reference field name on the child model (implicit in Prisma) */
      mappedBy?: string
    }
  | {
      cardinality: 'manyToMany'
      relatedModel: string
      through?: {
        model: string
        sourceField: string
        targetField: string
      }
    }

export type PrismaRelationFragment = {
  /** Source Prisma model name */
  sourceModel: string
  /** Suggested field name on the source model */
  fieldName: string
  spec: PrismaRelationFieldSpec
}

function columnToFieldName(column: ColumnRef): string {
  if (!column.includes('.')) {
    return column
  }
  const segments = column.split('.')
  const last = segments[segments.length - 1]
  return last ?? column
}

/**
 * Maps canonical relationships to Prisma-style relation metadata.
 * Many-to-many without an explicit join model returns `through` undefined (implicit M:N in Prisma 2+).
 */
export function canonicalToPrismaRelationFragment(rel: CanonicalRelationship): PrismaRelationFragment {
  const sourceModel = rel.sourceEntity
  const relatedModel = rel.targetEntity
  const fieldName = rel.name

  switch (rel.kind) {
    case 'manyToOne':
      return {
        sourceModel,
        fieldName,
        spec: {
          cardinality: 'manyToOne',
          relatedModel,
          fields: [columnToFieldName(rel.foreignKey.from)],
          references: [columnToFieldName(rel.foreignKey.to)]
        }
      }
    case 'oneToMany':
      return {
        sourceModel,
        fieldName,
        spec: {
          cardinality: 'oneToMany',
          relatedModel,
          mappedBy: rel.name
        }
      }
    case 'oneToOne':
      if (rel.foreignKeyOwner === 'source') {
        return {
          sourceModel,
          fieldName,
          spec: {
            cardinality: 'oneToOne',
            relatedModel,
            fields: [columnToFieldName(rel.foreignKey.from)],
            references: [columnToFieldName(rel.foreignKey.to)],
            optional: true
          }
        }
      }
      return {
        sourceModel,
        fieldName,
        spec: {
          cardinality: 'oneToOne',
          relatedModel,
          fields: [],
          references: [],
          optional: true,
          inverseSideOwnsForeignKey: true
        }
      }
    case 'manyToMany': {
      const j = rel.junction
      const throughModel = j.throughEntity
      return {
        sourceModel,
        fieldName,
        spec: {
          cardinality: 'manyToMany',
          relatedModel,
          through: throughModel
            ? {
                model: throughModel,
                sourceField: columnToFieldName(j.sourceToJunction.to),
                targetField: columnToFieldName(j.junctionToTarget.from)
              }
            : undefined
        }
      }
    }
  }
}

/**
 * Renders a minimal Prisma relation line for documentation or codegen (not a full schema printer).
 */
export function prismaRelationFragmentToString(fragment: PrismaRelationFragment): string {
  const { fieldName, spec } = fragment
  switch (spec.cardinality) {
    case 'manyToOne':
      return `  ${fieldName} ${spec.relatedModel} @relation(fields: [${spec.fields.join(', ')}], references: [${spec.references.join(', ')}])`
    case 'oneToMany':
      return `  ${fieldName} ${spec.relatedModel}[]`
    case 'oneToOne':
      if (spec.inverseSideOwnsForeignKey) {
        return `  ${fieldName} ${spec.relatedModel}?`
      }
      return `  ${fieldName} ${spec.relatedModel}? @relation(fields: [${spec.fields.join(', ')}], references: [${spec.references.join(', ')}])`
    case 'manyToMany':
      if (spec.through) {
        return `  ${fieldName} ${spec.relatedModel}[] @relation("${fragment.sourceModel}To${spec.relatedModel}")`
      }
      return `  ${fieldName} ${spec.relatedModel}[]`
  }
}
