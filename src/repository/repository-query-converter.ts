import type { QueryModel } from '../model/query-model'

/**
 * Converts domain query state into an ORM-specific query object.
 */
export interface RepositoryQueryConverter<
  Model extends object = object,
  PersistenceQuery extends object = QueryModel<Model, any>
> {
  toPersistenceQuery(query: Readonly<QueryModel<Model, any>>): PersistenceQuery
}

/**
 * Default converter that preserves the domain query shape.
 */
export class IdentityRepositoryQueryConverter<Model extends object = object>
  implements RepositoryQueryConverter<Model, QueryModel<Model, any>>
{
  toPersistenceQuery(query: Readonly<QueryModel<Model, any>>): QueryModel<Model, any> {
    return query as QueryModel<Model, any>
  }
}
