import type { Knex } from 'knex'
import type { Model, ModelClass, PartialModelObject, QueryBuilder } from 'objection'
import { GenericOrmClient } from '../../generic-orm-client'
import type { ModelAttributeFieldNumber } from '../../model/model-domain'
import { OptimisticLockConflictError } from '../../repository/repository-errors'
import type { PaginationResult } from '../../types'
import { ObjectionQueryConverter } from './objection-query-converter'
import type { MaybeCompositeId, ObjectionClientOptions, ObjectionQuery } from './types'
import { coerceNumeric, getAggregateAlias } from './utils'

export class ObjectionClient<
  PersistenceModel extends Model,
  DomainQueryModel extends object = PersistenceModel
> extends GenericOrmClient<PersistenceModel, ObjectionQuery<PersistenceModel, DomainQueryModel>, DomainQueryModel> {
  readonly queryConverter: ObjectionQueryConverter<PersistenceModel, DomainQueryModel>

  constructor(
    private readonly modelClass: ModelClass<PersistenceModel>,
    private readonly options: ObjectionClientOptions<DomainQueryModel> = {},
    private readonly trx?: Knex.Transaction
  ) {
    super()
    this.queryConverter = new ObjectionQueryConverter(modelClass, options, trx)
  }

  withTrx(trx: Knex.Transaction): this {
    return new ObjectionClient(this.modelClass, this.options, trx) as this
  }

  getKnex(): Knex {
    return this.modelClass.knex()
  }

  async findAll(query: ObjectionQuery<PersistenceModel, DomainQueryModel>): Promise<PersistenceModel[]> {
    return query.createBuilder()
  }

  async findOne(query: ObjectionQuery<PersistenceModel, DomainQueryModel>): Promise<PersistenceModel | null> {
    return (await query.createBuilder().first()) ?? null
  }

  async findById(
    id: string | number,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<PersistenceModel | null> {
    const builder = query?.createBuilder() ?? this.modelClass.query(this.trx)
    return (await (builder as QueryBuilder<PersistenceModel, PersistenceModel[]>).findById(id)) ?? null
  }

  async count(query: ObjectionQuery<PersistenceModel, DomainQueryModel>): Promise<number> {
    return query.createBuilder({ applyPagination: false }).resultSize()
  }

  async aggregate(query: ObjectionQuery<PersistenceModel, DomainQueryModel>): Promise<number> {
    const aggregation = query.state.aggregations[0]
    if (!aggregation) {
      return 0
    }

    const row = (await query.createBuilder({ applyPagination: false }).first()) as Record<string, unknown> | undefined

    if (!row) {
      return 0
    }

    return coerceNumeric(row[getAggregateAlias(aggregation)])
  }

  async paginate(
    query: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<PaginationResult<PersistenceModel>> {
    const pageSize = query.state.limit ?? 10
    const offset = query.state.offset ?? 0
    const pageIndex = Math.floor(offset / pageSize)
    const result = await query.createBuilder({ applyPagination: false }).page(pageIndex, pageSize)
    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / pageSize)

    return {
      items: result.results,
      meta: {
        totalPages,
        currentPage: pageIndex + 1,
        pageSize,
        recordCount: result.total
      }
    }
  }

  async insert(
    model: PersistenceModel[] | PersistenceModel,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    await (query?.createBuilder() ?? this.modelClass.query(this.trx)).insert(
      model as PartialModelObject<PersistenceModel>
    )
  }

  async update(
    model: Partial<PersistenceModel>,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    const patch = this.omitIdentifierFields(model) as PartialModelObject<PersistenceModel>

    if (this.options.versionField) {
      await this.updateWithOptimisticLock(model, patch, query)
      return
    }

    if (query) {
      await query.createBuilder().patch(patch)
      return
    }

    const id = this.extractIdentifier(model)
    await this.modelClass.query(this.trx).patchAndFetchById(id, patch)
  }

  private async updateWithOptimisticLock(
    model: Partial<PersistenceModel>,
    patch: PartialModelObject<PersistenceModel>,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    const versionProp = String(this.options.versionField)
    const currentVersion = (model as Record<string, unknown>)[versionProp]

    if (currentVersion === undefined || currentVersion === null) {
      throw new Error(
        `ObjectionClient requires the version field "${versionProp}" to be present for optimistic locking`
      )
    }

    const versionColumn = this.modelClass.propertyNameToColumnName(versionProp)
    const nextVersion = (currentVersion as number) + 1
    const patchWithVersion = { ...patch, [versionProp]: nextVersion }

    let numUpdated: number

    if (query) {
      numUpdated = await query
        .createBuilder()
        .patch(patchWithVersion)
        .where(versionColumn, currentVersion as string | number)
    } else {
      const id = this.extractIdentifier(model)
      const idColumns = this.getIdColumns()
      let builder = this.modelClass.query(this.trx).patch(patchWithVersion as PartialModelObject<PersistenceModel>)

      if (Array.isArray(id)) {
        idColumns.forEach((col, i) => {
          builder = builder.where(col, (id as Array<string | number | bigint | Buffer>)[i] as string | number)
        })
      } else {
        builder = builder.where(idColumns[0], id as string | number)
      }

      numUpdated = await builder.where(versionColumn, currentVersion as string | number)
    }

    if (numUpdated === 0) {
      throw new OptimisticLockConflictError(
        `ObjectionClient optimistic lock conflict: record was modified by another process (version ${String(currentVersion)})`
      )
    }
  }

  async upsert(model: PersistenceModel, query?: ObjectionQuery<PersistenceModel, DomainQueryModel>): Promise<void> {
    const idColumns = this.getIdColumns()
    const conflictTarget = idColumns.length === 1 ? idColumns[0] : idColumns

    await (query?.createBuilder() ?? this.modelClass.query(this.trx))
      .insert(model as PartialModelObject<PersistenceModel>)
      .onConflict(conflictTarget)
      .merge()
  }

  async destroy(
    model: PersistenceModel[] | PersistenceModel,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    const models = Array.isArray(model) ? model : [model]
    const ids = models.map((item) => this.extractIdentifier(item))

    if (ids.length === 1) {
      await (query?.createBuilder() ?? this.modelClass.query(this.trx)).deleteById(ids[0])
      return
    }

    await (query?.createBuilder() ?? this.modelClass.query(this.trx)).findByIds(ids).delete()
  }

  async increment(
    field: ModelAttributeFieldNumber<PersistenceModel>,
    value: number,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    await (query?.createBuilder() ?? this.modelClass.query(this.trx)).increment(String(field), value)
  }

  async decrement(
    field: ModelAttributeFieldNumber<PersistenceModel>,
    value: number,
    query?: ObjectionQuery<PersistenceModel, DomainQueryModel>
  ): Promise<void> {
    await (query?.createBuilder() ?? this.modelClass.query(this.trx)).decrement(String(field), value)
  }

  private getIdColumns(): string[] {
    return Array.isArray(this.modelClass.idColumn) ? this.modelClass.idColumn : [this.modelClass.idColumn]
  }

  private extractIdentifier(model: Partial<PersistenceModel>): MaybeCompositeId {
    const values = this.getIdColumns().map((column) => {
      const propertyName = this.modelClass.columnNameToPropertyName(column)
      const value = (model as Record<string, unknown>)[propertyName] ?? (model as Record<string, unknown>)[column]

      if (value === undefined || value === null) {
        throw new Error(`ObjectionClient requires the identifier field "${propertyName}" to be present`)
      }

      return value as string | number | bigint | Buffer
    })

    return values.length === 1 ? values[0] : values
  }

  private omitIdentifierFields(model: Partial<PersistenceModel>): Partial<PersistenceModel> {
    const clone = { ...(model as Record<string, unknown>) }

    for (const column of this.getIdColumns()) {
      delete clone[column]
      delete clone[this.modelClass.columnNameToPropertyName(column)]
    }

    return clone as Partial<PersistenceModel>
  }
}
