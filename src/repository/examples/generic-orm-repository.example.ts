import { GenericOrmClient } from '../../generic-orm-client'
import type { ModelAttributeField } from '../../model/model-domain'
import type { QueryModel } from '../../model/query-model'
import type { PaginationResult } from '../../types'
import { GenericOrmRepository } from '../generic-orm-repository'
import { RepositoryMapper } from '../repository-adapter'
import type { RepositoryQueryConverter } from '../repository-query-converter'

interface ProductRow {
  id: number
  sku: string
  unit_price: number
}

interface ProductReadModel {
  id: number
  sku: string
  unitPrice: number
}

type ProductAggregate = { id: number; sku: string; unitPrice: number }
type ProductOrmQuery = { filtersCount: number; limit?: number }

class ProductMapper extends RepositoryMapper<ProductRow, ProductReadModel> {
  toPersistence(domain: ProductReadModel): ProductRow {
    return {
      id: domain.id,
      sku: domain.sku,
      unit_price: domain.unitPrice
    }
  }

  toDomain(persistence: ProductRow): ProductReadModel {
    return {
      id: persistence.id,
      sku: persistence.sku,
      unitPrice: persistence.unit_price
    }
  }
}

class ProductQueryConverter implements RepositoryQueryConverter<ProductAggregate, ProductOrmQuery> {
  toPersistenceQuery(query: Readonly<QueryModel<ProductAggregate, any>>): ProductOrmQuery {
    return {
      filtersCount: query.where.length,
      limit: query.limit
    }
  }
}

export class ProductOrmClient extends GenericOrmClient<ProductRow, ProductOrmQuery, ProductAggregate> {
  readonly queryConverter = new ProductQueryConverter()

  async findAll(_query: ProductOrmQuery): Promise<ProductRow[]> {
    return []
  }

  async findOne(_query: ProductOrmQuery): Promise<ProductRow | null> {
    return null
  }

  async findById(_id: string | number, _query?: ProductOrmQuery): Promise<ProductRow | null> {
    return null
  }

  async count(_query: ProductOrmQuery): Promise<number> {
    return 0
  }

  async aggregate(_query: ProductOrmQuery): Promise<number> {
    return 0
  }

  async paginate(_query: ProductOrmQuery): Promise<PaginationResult<ProductRow>> {
    return {
      items: [],
      meta: { totalPages: 0, currentPage: 1, pageSize: 10, recordCount: 0 }
    }
  }

  async insert(_model: ProductRow | ProductRow[]): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async update(_model: Partial<ProductRow>): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async upsert(_model: ProductRow): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async destroy(_model: ProductRow | ProductRow[]): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async increment(_field: ModelAttributeField<ProductRow>, _value: number): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async decrement(_field: ModelAttributeField<ProductRow>, _value: number): Promise<void> {
    throw new Error('Not implemented for the example')
  }
}

/**
 * Example of a concrete repository that delegates query execution to any ORM client.
 */
export class GenericOrmProductRepository extends GenericOrmRepository<
  ProductAggregate,
  ProductReadModel,
  ProductRow,
  ProductOrmQuery
> {
  protected readonly mapper = new ProductMapper()

  async insert(_model: ProductAggregate | ProductAggregate[]): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async update(_model: Partial<ProductAggregate>): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async upsert(_model: ProductAggregate): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async destroy(_model: ProductAggregate | ProductAggregate[]): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async increment(_field: ModelAttributeField<ProductAggregate>, _value: number): Promise<void> {
    throw new Error('Not implemented for the example')
  }

  async decrement(_field: ModelAttributeField<ProductAggregate>, _value: number): Promise<void> {
    throw new Error('Not implemented for the example')
  }
}
