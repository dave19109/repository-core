import type { EmptyRelationshipMap, RelationshipDefinitions } from '../model/model-domain'
import { QueryModel } from '../model/query-model'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderBase<
  Model extends object = object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  constructor() {
    super(
      new QueryModel<Model, Rel>({
        aggregations: [],
        joins: [],
        groupBy: [],
        sort: [],
        select: ['*'],
        distinct: false,
        where: []
      })
    )
  }
}
