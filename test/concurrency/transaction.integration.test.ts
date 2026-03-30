import Knex from 'knex'
import { Model } from 'objection'
import { ObjectionRepository } from '../../src/adapters/objection/objection-repository'
import { runInTransaction } from '../../src/concurrency/transaction'
import type { RepositoryMapper } from '../../src/repository/repository-adapter'

// ── DB Setup ─────────────────────────────────────────────────────────────────

const knex = Knex({ client: 'better-sqlite3', connection: ':memory:', useNullAsDefault: true })

beforeAll(async () => {
  await knex.schema.createTable('users', (t) => {
    t.increments('id')
    t.string('name').notNullable()
    t.integer('version').notNullable().defaultTo(1)
  })

  await knex.schema.createTable('orders', (t) => {
    t.increments('id')
    t.string('label').notNullable()
  })

  Model.knex(knex)
})

afterAll(async () => {
  await knex.destroy()
})

afterEach(async () => {
  await knex('users').delete()
  await knex('orders').delete()
})

// ── Models ───────────────────────────────────────────────────────────────────

class UserModel extends Model {
  static override tableName = 'users'
  static override idColumn = 'id'

  declare id: number
  declare name: string
  declare version: number
}

class OrderModel extends Model {
  static override tableName = 'orders'
  static override idColumn = 'id'

  declare id: number
  declare label: string
}

// ── Repositories ─────────────────────────────────────────────────────────────

interface UserDomain {
  id: number
  name: string
  version: number
}

interface OrderDomain {
  id: number
  label: string
}

class UserRepository extends ObjectionRepository<UserModel, UserDomain> {
  protected readonly mapper: RepositoryMapper<UserModel, UserDomain> = {
    toDomain: (m) => ({ id: m.id, name: m.name, version: m.version }),
    toPersistence: (d) => ({ id: d.id, name: d.name, version: d.version }) as UserModel
  }
}

class OrderRepository extends ObjectionRepository<OrderModel, OrderDomain> {
  protected readonly mapper: RepositoryMapper<OrderModel, OrderDomain> = {
    toDomain: (m) => ({ id: m.id, label: m.label }),
    toPersistence: (d) => ({ id: d.id, label: d.label }) as OrderModel
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('withTransaction — single-repo', () => {
  it('commits both operations on success', async () => {
    const repo = new UserRepository(UserModel)
    await repo.withTransaction(async (txRepo) => {
      await txRepo.insert({ id: 1, name: 'Alice', version: 1 } as any)
      await txRepo.insert({ id: 2, name: 'Bob', version: 1 } as any)
    })
    const rows = await knex('users').select()
    expect(rows).toHaveLength(2)
  })

  it('rolls back all operations on error', async () => {
    const repo = new UserRepository(UserModel)
    await expect(
      repo.withTransaction(async (txRepo) => {
        await txRepo.insert({ id: 1, name: 'Alice', version: 1 } as any)
        throw new Error('something went wrong')
      })
    ).rejects.toThrow('something went wrong')
    const rows = await knex('users').select()
    expect(rows).toHaveLength(0)
  })
})

describe('withTrx + runInTransaction — cross-repo', () => {
  it('commits both inserts atomically', async () => {
    const userRepo = new UserRepository(UserModel)
    const orderRepo = new OrderRepository(OrderModel)

    await runInTransaction(knex, async (trx) => {
      await userRepo.withTrx(trx).insert({ id: 1, name: 'Alice', version: 1 } as any)
      await orderRepo.withTrx(trx).insert({ id: 1, label: 'Order A' } as any)
    })

    const userCount = await knex('users').count('* as n').first()
    const orderCount = await knex('orders').count('* as n').first()
    expect(userCount?.n).toBe(1)
    expect(orderCount?.n).toBe(1)
  })

  it('rolls back both repos on error', async () => {
    const userRepo = new UserRepository(UserModel)
    const orderRepo = new OrderRepository(OrderModel)

    await expect(
      runInTransaction(knex, async (trx) => {
        await userRepo.withTrx(trx).insert({ id: 1, name: 'Alice', version: 1 } as any)
        await orderRepo.withTrx(trx).insert({ id: 1, label: 'Order A' } as any)
        throw new Error('abort')
      })
    ).rejects.toThrow('abort')

    const userCount = await knex('users').count('* as n').first()
    const orderCount = await knex('orders').count('* as n').first()
    expect(userCount?.n).toBe(0)
    expect(orderCount?.n).toBe(0)
  })
})
