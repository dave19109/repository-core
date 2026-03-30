import type { ModelAttributeField } from '../src/model/model-domain'
import type { QueryModel } from '../src/model/query-model'
import type { QueryBuilder } from '../src/query-builder/query-builder'
import { Repository } from '../src/repository/repository'
import { RepositoryMapper } from '../src/repository/repository-adapter'
import type { RepositoryQueryConverter } from '../src/repository/repository-query-converter'
import type { PaginationResult } from '../src/types'

type ItemModel = { id: number; name: string; price: number }

interface ItemOut {
  id: number
  name: string
  price: number
}

interface InMemoryQuery {
  filtersCount: number
  limit?: number
  paranoid?: boolean
}

class InMemoryQueryConverter implements RepositoryQueryConverter<ItemModel, InMemoryQuery> {
  toPersistenceQuery(query: Readonly<QueryModel<ItemModel, any>>): InMemoryQuery {
    return {
      filtersCount: query.where.length,
      limit: query.limit,
      paranoid: query.paranoid
    }
  }
}

class ItemMapper extends RepositoryMapper<ItemModel, ItemOut> {
  toPersistence(model: ItemOut): ItemModel {
    return { id: model.id, name: model.name, price: model.price }
  }

  toDomain(persistent: ItemModel): ItemOut {
    return { id: persistent.id, name: persistent.name, price: persistent.price }
  }
}

class InMemoryItemRepository extends Repository<ItemModel, ItemOut, ItemModel> {
  private items: ItemModel[] = []
  private lastQuery: InMemoryQuery | null = null
  protected readonly mapper = new ItemMapper()
  private readonly queryConverter = new InMemoryQueryConverter()

  private toPersistenceQuery(query: QueryBuilder<ItemModel>): InMemoryQuery {
    return this.queryConverter.toPersistenceQuery(query.getState())
  }

  seed(items: ItemModel[]): void {
    this.items = items
  }

  protected async executeFindAll(query: QueryBuilder<ItemModel>): Promise<ItemModel[]> {
    this.lastQuery = this.toPersistenceQuery(query)
    return this.items
  }

  protected async executeFindOne(query: QueryBuilder<ItemModel>): Promise<ItemModel | null> {
    this.lastQuery = this.toPersistenceQuery(query)
    return this.items[0] ?? null
  }

  protected async executeCount(query: QueryBuilder<ItemModel>): Promise<number> {
    this.lastQuery = this.toPersistenceQuery(query)
    return this.items.length
  }

  protected async executePaginate(query: QueryBuilder<ItemModel>): Promise<PaginationResult<ItemModel>> {
    this.lastQuery = this.toPersistenceQuery(query)
    return {
      items: this.items,
      meta: { totalPages: 1, currentPage: 1, pageSize: 10, recordCount: this.items.length }
    }
  }

  protected async executeAggregate(query: QueryBuilder<ItemModel>): Promise<number> {
    this.lastQuery = this.toPersistenceQuery(query)
    const agg = query.getState().aggregations[0]
    if (!agg) {
      return 0
    }

    const values = this.items.map((item) => item[agg.field as 'id' | 'price'] as number)
    switch (agg.fn) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0)
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      case 'count':
        return values.length
    }
  }

  getLastQuery(): InMemoryQuery | null {
    return this.lastQuery
  }

  async findById(id: string | number): Promise<ItemOut | null> {
    const found = this.items.find((item) => item.id === Number(id))
    if (!found) {
      return null
    }
    return { id: found.id, name: found.name, price: found.price }
  }

  async insert(_model: ItemModel[] | ItemModel): Promise<void> {
    // no-op
  }

  async update(_model: Partial<ItemModel>): Promise<void> {
    // no-op
  }

  async upsert(_model: ItemModel): Promise<void> {
    // no-op
  }

  async destroy(_model: ItemModel[] | ItemModel): Promise<void> {
    // no-op
  }

  async increment(_field: ModelAttributeField<ItemModel>, _value: number): Promise<void> {
    // no-op
  }

  async decrement(_field: ModelAttributeField<ItemModel>, _value: number): Promise<void> {
    // no-op
  }
}

describe('Repository', () => {
  let repo: InMemoryItemRepository

  beforeEach(() => {
    repo = new InMemoryItemRepository()
    repo.seed([
      { id: 1, name: 'Alpha', price: 10 },
      { id: 2, name: 'Beta', price: 30 },
      { id: 3, name: 'Gamma', price: 20 }
    ])
  })

  it('should findAll and map to domain output', async () => {
    const results = await repo.findAll()
    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ id: 1, name: 'Alpha', price: 10 })
  })

  it('should findAll with a query callback', async () => {
    const results = await repo.findAll((q) => q.where('name', 'eq', 'Alpha'))
    expect(results).toHaveLength(3)
    expect(repo.getLastQuery()).toEqual({ filtersCount: 1, limit: undefined, paranoid: false })
  })

  it('should convert domain query for findOne operations', async () => {
    await repo.findOne((q) => q.where('id', 'eq', 2))
    expect(repo.getLastQuery()).toEqual({ filtersCount: 1, limit: 1, paranoid: false })
  })

  it('should propagate paranoid to the persistence query', async () => {
    await repo.findAll((q) => q.paranoid(true).where('id', 'eq', 1))
    expect(repo.getLastQuery()).toEqual({ filtersCount: 1, limit: undefined, paranoid: true })
  })

  it('should findOne and map to domain output', async () => {
    const result = await repo.findOne()
    expect(result).toEqual({ id: 1, name: 'Alpha', price: 10 })
  })

  it('should return null from findOne when no items', async () => {
    repo.seed([])
    const result = await repo.findOne()
    expect(result).toBeNull()
  })

  it('should count items', async () => {
    const count = await repo.count()
    expect(count).toBe(3)
  })

  it('should findById', async () => {
    const result = await repo.findById(2)
    expect(result).toEqual({ id: 2, name: 'Beta', price: 30 })
  })

  it('should return null from findById for missing item', async () => {
    const result = await repo.findById(999)

    expect(result).toBeNull()
  })

  it('should paginate records', async () => {
    const result = await repo.paginate()
    expect(result.items).toHaveLength(3)
    expect(result.meta.recordCount).toBe(3)
  })

  it('should compute sum of a field', async () => {
    const result = await repo.sum('price')
    expect(result).toBe(60)
  })

  it('should compute avg of a field', async () => {
    const result = await repo.avg('price')
    expect(result).toBe(20)
  })

  it('should compute min of a field', async () => {
    const result = await repo.min('price')
    expect(result).toBe(10)
  })

  it('should compute max of a field', async () => {
    const result = await repo.max('price')
    expect(result).toBe(30)
  })

  it('should compute sum with a query filter', async () => {
    const result = await repo.sum('price', (q) => q.where('name', 'eq', 'Alpha'))
    expect(result).toBe(60)
  })
})
