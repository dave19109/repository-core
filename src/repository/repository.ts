import type {
  AsRelationshipDefinitions,
  EmptyRelationshipMap,
  ModelAttributeField,
  ModelAttributeFieldNumber
} from '../model/model-domain'
import { QueryBuilder } from '../query-builder/query-builder'
import type { AggregateFunction, PaginationResult } from '../types'
import type { RepositoryMapper } from './repository-adapter'
import type {
  AggregateQueryCallback,
  CountQueryCallback,
  FindAllQueryCallback,
  FindOneQueryCallback,
  MutationQueryCallback,
  PaginateQueryCallback,
  RepositoryPort
} from './repository-contracts'
import { RepositoryExecutionError, RepositoryMappingError, RepositoryQueryBuildError } from './repository-errors'
import type { AggregateQuery, CountQuery, FindAllQuery, FindOneQuery, PaginateQuery } from './repository-query-scopes'

export type {
  AggregateQueryCallback,
  CountQueryCallback,
  FindAllQueryCallback,
  FindOneQueryCallback,
  MutationQueryCallback,
  PaginateQueryCallback
} from './repository-contracts'

export abstract class Repository<
  Model extends object,
  DomainRecord extends object = Record<string, any>,
  PersistenceModel extends object = Model,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> implements RepositoryPort<Model, DomainRecord, Rel>
{
  protected abstract readonly mapper: RepositoryMapper<PersistenceModel, DomainRecord>

  private errorContext(operation: string) {
    return { operation, model: this.constructor.name }
  }

  /**
   * Executes a find all query.
   * @param {FindAllQueryCallback<Model>} builder - The query builder to use for the find all.
   * @returns {Promise<DomainRecord[]>} - A promise that resolves with the models.
   */
  async findAll(builder?: FindAllQueryCallback<Model, Rel>): Promise<DomainRecord[]> {
    const operation = 'findAll'
    const query = this.makeScopedQueryBuilder<FindAllQuery<Model, Rel>>(builder, operation)

    let result: PersistenceModel[]
    try {
      result = await this.executeFindAll(query as unknown as QueryBuilder<Model, Rel>)
    } catch (cause) {
      throw new RepositoryExecutionError(`Repository ${operation} execution failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }

    try {
      return result.map((item) => this.mapper.toDomain(item))
    } catch (cause) {
      throw new RepositoryMappingError(`Repository ${operation} mapping failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }

  /**
   * Executes a find one query.
   * @param {FindOneQueryCallback<Model>} builder - The query builder to use for the find one.
   * @returns {Promise<DomainRecord | null>} - A promise that resolves with the model or null if not found.
   */
  async findOne(builder?: FindOneQueryCallback<Model, Rel>): Promise<DomainRecord | null> {
    const operation = 'findOne'
    const query = this.makeScopedQueryBuilder<FindOneQuery<Model, Rel>>(builder, operation)
    const scopedQuery = query.getState().limit === 1 ? query : query.limit(1)

    let result: PersistenceModel | null
    try {
      result = await this.executeFindOne(scopedQuery as unknown as QueryBuilder<Model, Rel>)
    } catch (cause) {
      throw new RepositoryExecutionError(`Repository ${operation} execution failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
    if (!result) {
      return null
    }

    try {
      return this.mapper.toDomain(result)
    } catch (cause) {
      throw new RepositoryMappingError(`Repository ${operation} mapping failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }

  /**
   * Checks if a model exists.
   * @param {FindOneQueryCallback<Model>} builder - The query builder to use for the exists.
   * @returns {Promise<boolean>} - A promise that resolves with true if the model exists, false otherwise.
   */
  async exists(builder?: FindOneQueryCallback<Model, Rel>): Promise<boolean> {
    const result = await this.findOne(builder)
    return result != null
  }

  /**
   * Executes a paginate query.
   * @param {PaginateQueryCallback<Model>} builder - The query builder to use for the paginate.
   * @returns {Promise<PaginationResult<DomainRecord>>} - A promise that resolves with the pagination result.
   */
  async paginate(builder?: PaginateQueryCallback<Model, Rel>): Promise<PaginationResult<DomainRecord>> {
    const operation = 'paginate'
    const query = this.makeScopedQueryBuilder<PaginateQuery<Model, Rel>>(builder, operation)
    const withLimit = query.getState().limit === undefined ? query.limit(10) : query
    const scopedQuery = withLimit.getState().offset === undefined ? withLimit.offset(0) : withLimit

    let result: PaginationResult<PersistenceModel>
    try {
      result = await this.executePaginate(scopedQuery as unknown as QueryBuilder<Model, Rel>)
    } catch (cause) {
      throw new RepositoryExecutionError(`Repository ${operation} execution failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }

    try {
      return {
        ...result,
        items: result.items.map((item) => this.mapper.toDomain(item))
      }
    } catch (cause) {
      throw new RepositoryMappingError(`Repository ${operation} mapping failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }

  /**
   * Executes a count query.
   * @param {CountQueryCallback<Model>} builder - The query builder to use for the count.
   * @returns {Promise<number>} - A promise that resolves with the count result.
   */
  async count(builder?: CountQueryCallback<Model, Rel>): Promise<number> {
    const operation = 'count'
    const query = this.makeScopedQueryBuilder<CountQuery<Model, Rel>>(builder, operation)

    try {
      return await this.executeCount(query as unknown as QueryBuilder<Model, Rel>)
    } catch (cause) {
      throw new RepositoryExecutionError(`Repository ${operation} execution failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }

  /**
   * Executes a sum aggregate query.
   * @param {Field} field - The field to aggregate.
   * @param {AggregateQueryCallback<Model>} builder - The query builder to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the sum result.
   */
  async sum<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number> {
    return this.executeAggregateQuery('sum', field, builder)
  }

  /**
   * Executes an avg aggregate query.
   * @param {Field} field - The field to aggregate.
   * @param {AggregateQueryCallback<Model>} builder - The query builder to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the avg result.
   */
  async avg<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number> {
    return this.executeAggregateQuery('avg', field, builder)
  }

  /**
   * Executes a min aggregate query.
   * @param {Field} field - The field to aggregate.
   * @param {AggregateQueryCallback<Model>} builder - The query builder to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the min result.
   */
  async min<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number> {
    return this.executeAggregateQuery('min', field, builder)
  }

  /**
   * Executes a max aggregate query.
   * @param {Field} field - The field to aggregate.
   * @param {AggregateQueryCallback<Model>} builder - The query builder to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the max result.
   */
  async max<Field extends ModelAttributeField<Model>>(
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number> {
    return this.executeAggregateQuery('max', field, builder)
  }

  /**
   * Inserts a new model into the repository.
   * @param {Model[] | Model} model - The model to insert.
   * @param {MutationQueryCallback<Model>} query - The query to use for the insert.
   * @returns {Promise<void>} - A promise that resolves when the model is inserted.
   */
  abstract insert(model: Model[] | Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>

  /**
   * Updates a model in the repository.
   * @param {Partial<Model>} model - The model to update.
   * @param {MutationQueryCallback<Model>} query - The query to use for the update.
   * @returns {Promise<void>} - A promise that resolves when the model is updated.
   */
  abstract update(model: Partial<Model>, query?: MutationQueryCallback<Model, Rel>): Promise<void>

  /**
   * Upserts a model in the repository.
   * @param {Model} model - The model to upsert.
   * @param {MutationQueryCallback<Model>} query - The query to use for the upsert.
   * @returns {Promise<void>} - A promise that resolves when the model is upserted.
   */
  abstract upsert(model: Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>

  /**
   * Deletes a model from the repository.
   * @param {Model[] | Model} model - The model to delete.
   * @param {MutationQueryCallback<Model>} query - The query to use for the delete.
   * @returns {Promise<void>} - A promise that resolves when the model is deleted.
   */
  abstract destroy(model: Model[] | Model, query?: MutationQueryCallback<Model, Rel>): Promise<void>

  /**
   * Increments a field in the repository.
   * @param {Field} field - The field to increment.
   * @param {number} value - The value to increment by.
   * @param {MutationQueryCallback<Model>} query - The query to use for the increment.
   * @returns {Promise<void>} - A promise that resolves when the field is incremented.
   */
  abstract increment(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void>

  /**
   * Decrements a field in the repository.
   * @param {Field} field - The field to decrement.
   * @param {number} value - The value to decrement by.
   * @param {MutationQueryCallback<Model>} query - The query to use for the decrement.
   * @returns {Promise<void>} - A promise that resolves when the field is decremented.
   */
  abstract decrement(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void>

  /**
   * Finds a model by its ID.
   * @param {string | number} id - The ID of the model to find.
   * @returns {Promise<DomainRecord | null>} - A promise that resolves with the model or null if not found.
   */
  abstract findById(id: string | number, builder?: FindOneQueryCallback<Model, Rel>): Promise<DomainRecord | null>

  /**
   * Executes a find all query.
   * @param {QueryBuilder<Model>} query - The query to execute.
   * @returns {Promise<PersistenceModel[]>} - A promise that resolves with the models.
   */
  protected abstract executeFindAll(query: QueryBuilder<Model, Rel>): Promise<PersistenceModel[]>

  /**
   * Executes a find one query.
   * @param {QueryBuilder<Model>} query - The query to execute.
   * @returns {Promise<PersistenceModel | null>} - A promise that resolves with the model or null if not found.
   */
  protected abstract executeFindOne(query: QueryBuilder<Model, Rel>): Promise<PersistenceModel | null>

  /**
   * Executes a count query.
   * @param {QueryBuilder<Model>} query - The query to execute.
   * @returns {Promise<number>} - A promise that resolves with the count.
   */
  protected abstract executeCount(query: QueryBuilder<Model, Rel>): Promise<number>

  /**
   * Executes a paginate query.
   * @param {QueryBuilder<Model>} query - The query to execute.
   * @returns {Promise<PaginationResult<PersistenceModel>>} - A promise that resolves with the pagination result.
   */
  protected abstract executePaginate(query: QueryBuilder<Model, Rel>): Promise<PaginationResult<PersistenceModel>>

  /**
   * Executes an aggregate query.
   * @param {QueryBuilder<Model>} query - The query to execute.
   * @returns {Promise<number>} - A promise that resolves with the aggregate result.
   */
  protected abstract executeAggregate(query: QueryBuilder<Model, Rel>): Promise<number>

  /**
   * Executes an aggregate query.
   * @param {AggregateFunction} fn - The aggregate function to execute.
   * @param {Field} field - The field to aggregate.
   * @param {AggregateQueryCallback<Model>} builder - The query builder to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the aggregate result.
   */
  private async executeAggregateQuery<Field extends ModelAttributeField<Model>>(
    fn: AggregateFunction,
    field: Field,
    builder?: AggregateQueryCallback<Model, Rel>
  ): Promise<number> {
    const operation = `aggregate:${fn}`

    const base = this.makeScopedQueryBuilder<AggregateQuery<Model, Rel>>(builder, operation)

    let queryAfterAggregate: unknown
    try {
      queryAfterAggregate = (base as unknown as QueryBuilder<Model, Rel>).aggregate(fn, field)
    } catch (cause) {
      throw new RepositoryQueryBuildError(`Repository ${operation} query build failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }

    try {
      return await this.executeAggregate(queryAfterAggregate as unknown as QueryBuilder<Model, Rel>)
    } catch (cause) {
      throw new RepositoryExecutionError(`Repository ${operation} execution failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }

  /**
   * Makes a scoped query builder.
   * @param {Q} builder - The query builder to use for the scoped query.
   * @returns {Q} - The scoped query builder.
   */
  private makeScopedQueryBuilder<Q>(builder: ((query: Q) => Q) | undefined, operation: string): Q {
    const query = new QueryBuilder<Model, Rel>() as unknown as Q
    if (!builder) {
      return query
    }

    try {
      return builder(query) ?? query
    } catch (cause) {
      throw new RepositoryQueryBuildError(`Repository ${operation} query builder callback failed`, {
        cause,
        context: this.errorContext(operation)
      })
    }
  }
}
