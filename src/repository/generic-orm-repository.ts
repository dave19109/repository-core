import type { GenericOrmClient } from '../generic-orm-client'
import type {
  AsRelationshipDefinitions,
  EmptyRelationshipMap,
  ModelAttributeField,
  ModelAttributeFieldNumber
} from '../model/model-domain'
import type { QueryModel } from '../model/query-model'
import { QueryBuilder } from '../query-builder/query-builder'
import type { PaginationResult } from '../types'
import { type FindOneQueryCallback, type MutationQueryCallback, Repository } from './repository'
import { RepositoryExecutionError, RepositoryMappingError, RepositoryQueryBuildError } from './repository-errors'
import type { FindOneQuery, MutationQuery } from './repository-query-scopes'

export abstract class GenericOrmRepository<
  Model extends object,
  DomainRecord extends object,
  PersistenceModel extends object = Model,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap,
  PersistenceQuery extends object = QueryModel<Model, Rel>
> extends Repository<Model, DomainRecord, PersistenceModel, Rel> {
  constructor(protected readonly client: GenericOrmClient<PersistenceModel, PersistenceQuery, Model>) {
    super()
  }

  private mutationErrorContext(operation: string) {
    return { operation, model: this.constructor.name }
  }

  /**
   * Inserts a model into the repository.
   * @param {Model | Model[]} model - The model to insert.
   * @param {MutationQueryCallback<Model>} query - The query to use for the insert.
   * @returns {Promise<void>} - A promise that resolves when the model is inserted.
   */
  async insert(model: Model | Model[], query?: MutationQueryCallback<Model, Rel>): Promise<void> {
    const persistenceModels = this.toPersistenceModels(model)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository insert query build failed', {
        cause,
        context: this.mutationErrorContext('insert')
      })
    }

    try {
      await this.client.insert(persistenceModels, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository insert execution failed', {
        cause,
        context: this.mutationErrorContext('insert')
      })
    }
  }

  /**
   * Updates a model in the repository.
   * @param {Partial<Model>} model - The model to update.
   * @param {MutationQueryCallback<Model>} query - The query to use for the update.
   * @returns {Promise<void>} - A promise that resolves when the model is updated.
   */
  async update(model: Partial<Model>, query?: MutationQueryCallback<Model, Rel>): Promise<void> {
    const persistenceModel = this.toPersistencePartialModel(model)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository update query build failed', {
        cause,
        context: this.mutationErrorContext('update')
      })
    }

    try {
      await this.client.update(persistenceModel, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository update execution failed', {
        cause,
        context: this.mutationErrorContext('update')
      })
    }
  }

  /**
   * Upserts a model in the repository.
   * @param {Model} model - The model to upsert.
   * @param {MutationQueryCallback<Model>} query - The query to use for the upsert.
   * @returns {Promise<void>} - A promise that resolves when the model is upserted.
   */
  async upsert(model: Model, query?: MutationQueryCallback<Model, Rel>): Promise<void> {
    const persistenceModel = this.toPersistenceModel(model)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository upsert query build failed', {
        cause,
        context: this.mutationErrorContext('upsert')
      })
    }

    try {
      await this.client.upsert(persistenceModel, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository upsert execution failed', {
        cause,
        context: this.mutationErrorContext('upsert')
      })
    }
  }

  /**
   * Deletes a model from the repository.
   * @param {Model | Model[]} model - The model to delete.
   * @param {MutationQueryCallback<Model>} query - The query to use for the delete.
   * @returns {Promise<void>} - A promise that resolves when the model is deleted.
   */
  async destroy(model: Model | Model[], query?: MutationQueryCallback<Model, Rel>): Promise<void> {
    const persistenceModels = this.toPersistenceModels(model)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository destroy query build failed', {
        cause,
        context: this.mutationErrorContext('destroy')
      })
    }

    try {
      await this.client.destroy(persistenceModels, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository destroy execution failed', {
        cause,
        context: this.mutationErrorContext('destroy')
      })
    }
  }

  /**
   * Increments a field in the repository.
   * @param {ModelAttributeField<Model>} field - The field to increment.
   * @param {number} value - The value to increment by.
   * @param {MutationQueryCallback<Model>} query - The query to use for the increment.
   * @returns {Promise<void>} - A promise that resolves when the field is incremented.
   */
  async increment(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void> {
    const persistenceField = this.toPersistenceField(field)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository increment query build failed', {
        cause,
        context: this.mutationErrorContext('increment')
      })
    }

    try {
      await this.client.increment(persistenceField, value, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository increment execution failed', {
        cause,
        context: this.mutationErrorContext('increment')
      })
    }
  }

  /**
   * Decrements a field in the repository.
   * @param {ModelAttributeField<Model>} field - The field to decrement.
   * @param {number} value - The value to decrement by.
   * @param {MutationQueryCallback<Model>} query - The query to use for the decrement.
   * @returns {Promise<void>} - A promise that resolves when the field is decremented.
   */
  async decrement(
    field: ModelAttributeFieldNumber<Model>,
    value: number,
    query?: MutationQueryCallback<Model, Rel>
  ): Promise<void> {
    const persistenceField = this.toPersistenceField(field)

    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceMutationQuery(query)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository decrement query build failed', {
        cause,
        context: this.mutationErrorContext('decrement')
      })
    }

    try {
      await this.client.decrement(persistenceField, value, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository decrement execution failed', {
        cause,
        context: this.mutationErrorContext('decrement')
      })
    }
  }
  /**
   * Finds a model by its ID.
   * @param {string | number} id - The ID of the model to find.
   * @param {FindOneQueryCallback<Model>} builder - The query builder to use for the find by id.
   * @returns {Promise<DomainRecord | null>} - A promise that resolves with the model or null if not found.
   */
  async findById(id: string | number, builder?: FindOneQueryCallback<Model, Rel>): Promise<DomainRecord | null> {
    let persistenceQuery: PersistenceQuery | undefined
    try {
      persistenceQuery = this.toPersistenceFindOneQuery(builder)
    } catch (cause) {
      throw new RepositoryQueryBuildError('Repository findById query build failed', {
        cause,
        context: this.mutationErrorContext('findById')
      })
    }

    let result: PersistenceModel | null
    try {
      result = await this.client.findById(id, persistenceQuery)
    } catch (cause) {
      throw new RepositoryExecutionError('Repository findById execution failed', {
        cause,
        context: this.mutationErrorContext('findById')
      })
    }

    if (!result) {
      return null
    }

    try {
      return this.mapper.toDomain(result)
    } catch (cause) {
      throw new RepositoryMappingError('Repository findById mapping failed', {
        cause,
        context: this.mutationErrorContext('findById')
      })
    }
  }

  /**
   * Executes a find all query.
   * @param {QueryBuilder<Model>} query - The query builder to execute.
   * @returns {Promise<PersistenceModel[]>} - A promise that resolves with the models.
   */
  protected executeFindAll(query: QueryBuilder<Model, Rel>): Promise<PersistenceModel[]> {
    return this.client.findAll(this.toPersistenceQuery(query))
  }

  /**
   * Executes a find one query.
   * @param {QueryBuilder<Model>} query - The query builder to execute.
   * @returns {Promise<PersistenceModel | null>} - A promise that resolves with the model or null if not found.
   */
  protected executeFindOne(query: QueryBuilder<Model, Rel>): Promise<PersistenceModel | null> {
    return this.client.findOne(this.toPersistenceQuery(query))
  }

  /**
   * Executes a count query.
   * @param {QueryBuilder<Model>} query - The query builder to execute.
   * @returns {Promise<number>} - A promise that resolves with the count result.
   */
  protected executeCount(query: QueryBuilder<Model, Rel>): Promise<number> {
    return this.client.count(this.toPersistenceQuery(query))
  }

  /**
   * Executes a paginate query.
   * @param {QueryBuilder<Model>} query - The query builder to execute.
   * @returns {Promise<PaginationResult<PersistenceModel>>} - A promise that resolves with the pagination result.
   */
  protected executePaginate(query: QueryBuilder<Model, Rel>): Promise<PaginationResult<PersistenceModel>> {
    return this.client.paginate(this.toPersistenceQuery(query))
  }

  /**
   * Executes an aggregate query.
   * @param {QueryBuilder<Model>} query - The query builder to execute.
   * @returns {Promise<number>} - A promise that resolves with the aggregate result.
   */
  protected executeAggregate(query: QueryBuilder<Model, Rel>): Promise<number> {
    return this.client.aggregate(this.toPersistenceQuery(query))
  }

  /**
   * Converts a query builder to a persistence query.
   * @param {QueryBuilder<Model>} query - The query builder to convert.
   * @returns {PersistenceQuery} - The converted persistence query.
   */
  private toPersistenceQuery(query: QueryBuilder<Model, Rel>): PersistenceQuery {
    return this.client.queryConverter.toPersistenceQuery(query.getState())
  }

  /**
   * Converts a model to a persistence model.
   * @param {Model} model - The model to convert.
   * @returns {PersistenceModel} - The converted persistence model.
   */
  protected toPersistenceModel(model: Model): PersistenceModel {
    return model as unknown as PersistenceModel
  }

  /**
   * Converts a partial model to a persistence partial model.
   * @param {Partial<Model>} model - The partial model to convert.
   * @returns {Partial<PersistenceModel>} - The converted persistence partial model.
   */
  protected toPersistencePartialModel(model: Partial<Model>): Partial<PersistenceModel> {
    return model as unknown as Partial<PersistenceModel>
  }

  /**
   * Converts a model attribute field to a persistence model attribute field.
   * @param {ModelAttributeField<Model>} field - The model attribute field to convert.
   * @returns {ModelAttributeField<PersistenceModel>} - The converted persistence model attribute field.
   */
  protected toPersistenceField(field: ModelAttributeField<Model>): ModelAttributeField<PersistenceModel> {
    return field as unknown as ModelAttributeField<PersistenceModel>
  }

  /**
   * Converts a model or models to persistence models.
   * @param {Model | Model[]} model - The model or models to convert.
   * @returns {PersistenceModel | PersistenceModel[]} - The converted persistence model or models.
   */
  private toPersistenceModels(model: Model | Model[]): PersistenceModel | PersistenceModel[] {
    return Array.isArray(model) ? model.map((item) => this.toPersistenceModel(item)) : this.toPersistenceModel(model)
  }

  /**
   * Converts a mutation query callback to a persistence query.
   * @param {MutationQueryCallback<Model>} query - The query callback to convert.
   * @returns {PersistenceQuery | undefined} - The converted persistence query or undefined if no query is provided.
   */
  private toPersistenceMutationQuery(query?: MutationQueryCallback<Model, Rel>): PersistenceQuery | undefined {
    if (!query) {
      return undefined
    }

    const scopedQuery = query(new QueryBuilder<Model, Rel>() as unknown as MutationQuery<Model, Rel>)
    return this.toPersistenceQuery(scopedQuery as unknown as QueryBuilder<Model, Rel>)
  }

  private toPersistenceFindOneQuery(builder?: FindOneQueryCallback<Model, Rel>): PersistenceQuery | undefined {
    if (!builder) {
      return undefined
    }

    const query = new QueryBuilder<Model, Rel>() as unknown as FindOneQuery<Model, Rel>
    const built = builder(query)
    const qb = built as unknown as QueryBuilder<Model, Rel>
    const scopedQuery = qb.getState().limit === 1 ? built : qb.limit(1)
    return this.toPersistenceQuery(scopedQuery as unknown as QueryBuilder<Model, Rel>)
  }
}
