import type { Knex } from 'knex'
import type { Model, ModelClass, ModelObject } from 'objection'
import type { RetryPolicy } from '../../concurrency/retry'
import { withRetry } from '../../concurrency/retry'
import { wrapIfSerializationError } from '../../concurrency/transaction'
import type { EmptyRelationshipMap, RelationshipDefinitions } from '../../model/model-domain'
import { GenericOrmRepository } from '../../repository/generic-orm-repository'
import { ObjectionClient } from './object-client'
import type { ObjectionQuery } from './types'

/**
 * Query builder and filter APIs use {@link ModelObject}, Objection's row-shaped type: it omits
 * framework members such as `QueryBuilderType` and `$modelClass` that are not real columns.
 */
export abstract class ObjectionRepository<
  M extends Model,
  D extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends GenericOrmRepository<ModelObject<M>, D, M, Rel, ObjectionQuery<M, ModelObject<M>>> {
  constructor(modelClass: ModelClass<M>) {
    super(
      new ObjectionClient<M, ModelObject<M>>(modelClass, {
        paranoidField: 'deletedAt'
      })
    )
  }

  /**
   * Returns a copy of this repository bound to an external Knex transaction.
   * Use with {@link runInTransaction} for cross-repository coordination.
   */
  withTrx(trx: Knex.Transaction): this {
    const scoped = Object.create(this) as this
    ;(scoped as unknown as { client: ObjectionClient<M, ModelObject<M>> }).client = (
      this.client as ObjectionClient<M, ModelObject<M>>
    ).withTrx(trx)
    return scoped
  }

  /**
   * Executes a callback inside a Knex transaction.
   * Automatically commits on success and rolls back on error.
   * Optionally retries on {@link OptimisticLockConflictError} and serialization failures.
   */
  async withTransaction<T>(callback: (txRepo: this) => Promise<T>, retryPolicy?: RetryPolicy): Promise<T> {
    const knex = (this.client as ObjectionClient<M, ModelObject<M>>).getKnex()

    const execute = async (): Promise<T> => {
      try {
        return await knex.transaction((trx) => {
          return callback(this.withTrx(trx))
        })
      } catch (error) {
        throw wrapIfSerializationError(error)
      }
    }

    if (retryPolicy) {
      return withRetry(execute, retryPolicy)
    }

    return execute()
  }
}
