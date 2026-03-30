import type { Model, ModelClass, ModelObject } from 'objection'
import type { EmptyRelationshipMap, RelationshipDefinitions } from '../../model/model-domain'
import { GenericOrmRepository } from '../../repository/generic-orm-repository'
import { ObjectionClient, type ObjectionQuery } from './object-client'

/**
 * Query builder and filter APIs use {@link ModelObject}, Objection's row-shaped type: it omits
 * framework members such as `QueryBuilderType` and `$modelClass` that are not real columns.
 */
export abstract class ObjectionRepository<
  M extends Model,
  D extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends GenericOrmRepository<ModelObject<M>, D, M, ObjectionQuery<M, ModelObject<M>>, Rel> {
  constructor(modelClass: ModelClass<M>) {
    super(
      new ObjectionClient<M, ModelObject<M>>(modelClass, {
        paranoidField: 'deletedAt'
      })
    )
  }
}
