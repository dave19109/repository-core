import { GenericOrmClient } from '../src/generic-orm-client'
import type { ModelAttributeField, ModelAttributeFieldNumber } from '../src/model/model-domain'
import type { QueryModel } from '../src/model/query-model'
import { GenericOrmRepository } from '../src/repository/generic-orm-repository'
import { RepositoryMapper } from '../src/repository/repository-adapter'
import type { RepositoryQueryConverter } from '../src/repository/repository-query-converter'
import type { PaginationResult } from '../src/types'

type ProductAggregate = { id: number; sku: string; unitPrice: number }

interface ProductReadModel {
  id: number
  sku: string
  unitPrice: number
}

interface ProductRow {
  id: number
  sku: string
  unit_price: number
}

interface ProductOrmQuery {
  filtersCount: number
  limit?: number
  paranoid?: boolean
}

class ProductQueryConverter implements RepositoryQueryConverter<ProductAggregate, ProductOrmQuery> {
  toPersistenceQuery(query: Readonly<QueryModel<ProductAggregate, any>>): ProductOrmQuery {
    return {
      filtersCount: query.where.length,
      limit: query.limit,
      paranoid: query.paranoid
    }
  }
}

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

class InMemoryProductClient extends GenericOrmClient<ProductRow, ProductOrmQuery, ProductAggregate> {
  readonly queryConverter = new ProductQueryConverter()

  private items: ProductRow[] = []
  private lastQuery: ProductOrmQuery | null = null

  seed(items: ProductRow[]): void {
    this.items = items
  }

  getLastQuery(): ProductOrmQuery | null {
    return this.lastQuery
  }

  async findAll(query: ProductOrmQuery): Promise<ProductRow[]> {
    this.lastQuery = query
    return this.items
  }

  async findOne(query: ProductOrmQuery): Promise<ProductRow | null> {
    this.lastQuery = query
    return this.items[0] ?? null
  }

  async findById(id: string | number, query?: ProductOrmQuery): Promise<ProductRow | null> {
    if (query !== undefined) {
      this.lastQuery = query
    }
    const numericId = Number(id)
    return this.items.find((row) => row.id === numericId) ?? null
  }

  async count(query: ProductOrmQuery): Promise<number> {
    this.lastQuery = query
    return this.items.length
  }

  async aggregate(query: ProductOrmQuery): Promise<number> {
    this.lastQuery = query
    return this.items.length
  }

  async paginate(query: ProductOrmQuery): Promise<PaginationResult<ProductRow>> {
    this.lastQuery = query
    return {
      items: this.items,
      meta: { totalPages: 1, currentPage: 1, pageSize: 10, recordCount: this.items.length }
    }
  }

  async insert(_model: ProductRow[] | ProductRow): Promise<void> {
    // no-op
  }

  async update(_model: Partial<ProductRow>): Promise<void> {
    // no-op
  }

  async upsert(_model: ProductRow): Promise<void> {
    // no-op
  }

  async destroy(_model: ProductRow[] | ProductRow): Promise<void> {
    // no-op
  }

  async increment(_field: ModelAttributeField<ProductRow>, _value: number): Promise<void> {
    // no-op
  }

  async decrement(_field: ModelAttributeField<ProductRow>, _value: number): Promise<void> {
    // no-op
  }
}

class ProductRepository extends GenericOrmRepository<ProductAggregate, ProductReadModel, ProductRow, ProductOrmQuery> {
  protected readonly mapper = new ProductMapper()

  async insert(_model: ProductAggregate[] | ProductAggregate): Promise<void> {
    // no-op
  }

  async update(_model: Partial<ProductAggregate>): Promise<void> {
    // no-op
  }

  async upsert(_model: ProductAggregate): Promise<void> {
    // no-op
  }

  async destroy(_model: ProductAggregate[] | ProductAggregate): Promise<void> {
    // no-op
  }

  async increment(_field: ModelAttributeFieldNumber<ProductAggregate>, _value: number): Promise<void> {
    // no-op
  }

  async decrement(_field: ModelAttributeFieldNumber<ProductAggregate>, _value: number): Promise<void> {
    // no-op
  }
}

describe('GenericOrmRepository', () => {
  let client: InMemoryProductClient
  let repository: ProductRepository

  beforeEach(() => {
    client = new InMemoryProductClient()
    client.seed([
      { id: 1, sku: 'ALPHA', unit_price: 10 },
      { id: 2, sku: 'BETA', unit_price: 20 }
    ])
    repository = new ProductRepository(client)
  })

  it('converts the repository query before delegating to the ORM client', async () => {
    const items = await repository.findAll((query) => query.paranoid(true).where('sku', 'eq', 'ALPHA'))

    expect(items).toHaveLength(2)
    expect(client.getLastQuery()).toEqual({ filtersCount: 1, limit: undefined, paranoid: true })
  })

  it('applies repository query shaping before delegating to the client', async () => {
    await repository.findOne((query) => query.where('id', 'eq', 1))

    expect(client.getLastQuery()).toEqual({ filtersCount: 1, limit: 1, paranoid: false })
  })

  it('delegates findById to the ORM client and maps the row to the domain', async () => {
    const row = await repository.findById(2)

    expect(row).toEqual({ id: 2, sku: 'BETA', unitPrice: 20 })
  })

  it('passes a converted find-one scope to findById when a builder is provided', async () => {
    await repository.findById(2, (query) => query.where('sku', 'eq', 'BETA'))

    expect(client.getLastQuery()).toEqual({ filtersCount: 1, limit: 1, paranoid: false })
  })
})
