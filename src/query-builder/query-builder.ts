import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import { QueryBuilderAggregate } from './query-builder-aggregate'
import { QueryBuilderBase } from './query-builder-base'
import { QueryBuilderDistinct } from './query-builder-distinct'
import { QueryBuilderGroup } from './query-builder-group'
import { QueryBuilderJoin } from './query-builder-join'
import { QueryBuilderLock } from './query-builder-lock'
import { QueryBuilderPagination } from './query-builder-pagination'
import { QueryBuilderParanoid } from './query-builder-paranoid'
import type { QueryBuilderInitial } from './query-builder-phases'
import { QueryBuilderSelect } from './query-builder-select'
import { QueryBuilderSort } from './query-builder-sort'
import { QueryBuilderWhere } from './query-builder-where'

type Constructor = abstract new (...args: never[]) => object

function applyMixins(derivedCtor: Constructor, baseCtors: Constructor[]): void {
  for (const baseCtor of baseCtors) {
    for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
      if (name !== 'constructor') {
        const obj = Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
        if (!obj) {
          throw new Error(`Property ${name} not found in ${baseCtor.name}`)
        }
        Object.defineProperty(derivedCtor.prototype, name, obj)
      }
    }
  }
}

applyMixins(QueryBuilderBase, [
  QueryBuilderWhere,
  QueryBuilderJoin,
  QueryBuilderSelect,
  QueryBuilderSort,
  QueryBuilderAggregate,
  QueryBuilderGroup,
  QueryBuilderDistinct,
  QueryBuilderParanoid,
  QueryBuilderPagination,
  QueryBuilderLock
])

type QueryBuilderConstructor = new <
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
>() => QueryBuilderInitial<Model, Rel>

export type QueryBuilder<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = QueryBuilderInitial<Model, Rel>

export const QueryBuilder = QueryBuilderBase as unknown as QueryBuilderConstructor
