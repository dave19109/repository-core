import type { ModelAttributeFieldNumber } from './model/model-domain'
import type { RepositoryQueryConverter } from './repository/repository-query-converter'
import type { PaginationResult } from './types'

/**
 * Minimal contract for an ORM-specific query executor.
 * Repositories are responsible for shaping and converting queries.
 *
 * @typeParam DomainQueryModel - Shape used by {@link QueryBuilder} / {@link QueryModel} (often the aggregate).
 * Defaults to {@link PersistenceModel} when persistence rows and query field paths align.
 */
export abstract class GenericOrmClient<
  PersistenceModel extends object,
  PersistenceQuery extends object,
  DomainQueryModel extends object = PersistenceModel
> {
  /**
   * Finds all models matching the query.
   * @param {PersistenceQuery} query - The query to use for the find all.
   * @returns {Promise<PersistenceModel[]>} - A promise that resolves with the models.
   */
  abstract findAll(query: PersistenceQuery): Promise<PersistenceModel[]>

  /**
   * Finds a single model matching the query.
   * @param {PersistenceQuery} query - The query to use for the find one.
   * @returns {Promise<PersistenceModel | null>} - A promise that resolves with the model or null if not found.
   */
  abstract findOne(query: PersistenceQuery): Promise<PersistenceModel | null>

  /**
   * Finds a single model by its ID.
   * @param {string | number} id - The ID of the model to find.
   * @param {PersistenceQuery} query - The query to use for the find by id.
   * @returns {Promise<PersistenceModel | null>} - A promise that resolves with the model or null if not found.
   */
  abstract findById(id: string | number, query?: PersistenceQuery): Promise<PersistenceModel | null>

  /**
   * Counts the number of models matching the query.
   * @param {PersistenceQuery} query - The query to use for the count.
   * @returns {Promise<number>} - A promise that resolves with the count.
   */
  abstract count(query: PersistenceQuery): Promise<number>

  /**
   * Aggregates the values of a field matching the query.
   * @param {PersistenceQuery} query - The query to use for the aggregate.
   * @returns {Promise<number>} - A promise that resolves with the aggregate.
   */
  abstract aggregate(query: PersistenceQuery): Promise<number>

  /**
   * Paginates the models matching the query.
   * @param {PersistenceQuery} query - The query to use for the paginate.
   * @returns {Promise<PaginationResult<PersistenceModel>>} - A promise that resolves with the pagination result.
   */
  abstract paginate(query: PersistenceQuery): Promise<PaginationResult<PersistenceModel>>

  /**
   * Inserts a new model into the database.
   * @param {PersistenceModel[] | PersistenceModel} model - The model to insert.
   * @param {PersistenceQuery} query - The query to use for the insert.
   * @returns {Promise<void>} - A promise that resolves when the model is inserted.
   */
  abstract insert(model: PersistenceModel[] | PersistenceModel, query?: PersistenceQuery): Promise<void>

  /**
   * Updates an existing model in the database.
   * @param {Partial<PersistenceModel>} model - The model to update.
   * @param {PersistenceQuery} query - The query to use for the update.
   * @returns {Promise<void>} - A promise that resolves when the model is updated.
   */
  abstract update(model: Partial<PersistenceModel>, query?: PersistenceQuery): Promise<void>

  /**
   * Upserts a new or existing model into the database.
   * @param {PersistenceModel} model - The model to upsert.
   * @param {PersistenceQuery} query - The query to use for the upsert.
   * @returns {Promise<void>} - A promise that resolves when the model is upserted.
   */
  abstract upsert(model: PersistenceModel, query?: PersistenceQuery): Promise<void>

  /**
   * Deletes a model from the database.
   * @param {PersistenceModel[] | PersistenceModel} model - The model to delete.
   * @param {PersistenceQuery} query - The query to use for the delete.
   * @returns {Promise<void>} - A promise that resolves when the model is deleted.
   */
  abstract destroy(model: PersistenceModel[] | PersistenceModel, query?: PersistenceQuery): Promise<void>

  /**
   * Increments a field in the database.
   * @param {ModelAttributeField<PersistenceModel>} field - The field to increment.
   * @param {number} value - The value to increment by.
   * @param {PersistenceQuery} query - The query to use for the increment.
   * @returns {Promise<void>} - A promise that resolves when the field is incremented.
   */
  abstract increment(
    field: ModelAttributeFieldNumber<PersistenceModel>,
    value: number,
    query?: PersistenceQuery
  ): Promise<void>

  /**
   * Decrements a field in the database.
   * @param {ModelAttributeField<PersistenceModel>} field - The field to decrement.
   * @param {number} value - The value to decrement by.
   * @param {PersistenceQuery} query - The query to use for the decrement.
   * @returns {Promise<void>} - A promise that resolves when the field is decremented.
   */
  abstract decrement(
    field: ModelAttributeFieldNumber<PersistenceModel>,
    value: number,
    query?: PersistenceQuery
  ): Promise<void>

  /**
   * The query converter to use for the client.
   * @returns {RepositoryQueryConverter<DomainQueryModel, PersistenceQuery>} - The query converter.
   */
  abstract queryConverter: RepositoryQueryConverter<DomainQueryModel, PersistenceQuery>
}
