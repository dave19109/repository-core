import type { AsRelationshipDefinitions, EmptyRelationshipMap } from '../model/model-domain'
import type { LockMode } from '../types'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderLock<
  Model extends object = object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> extends BaseQueryBuilder<Model, Rel> {
  /**
   * Sets a pessimistic lock mode for the query.
   * Must be used inside a transaction to have effect.
   *
   * @param {LockMode} mode - 'for update' or 'for share'
   * @returns {this} - Returns a cloned instance with the lock mode set.
   */
  lock(mode: LockMode): this {
    const clone = this.clone()
    clone.state.lock = mode
    return clone
  }
}
