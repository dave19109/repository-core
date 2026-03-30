import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import { QueryModel } from '../model/query-model'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderBase<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
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
