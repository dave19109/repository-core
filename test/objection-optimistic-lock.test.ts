import { Model } from 'objection'
import { ObjectionClient } from '../src/adapters/objection/object-client'
import { OptimisticLockConflictError } from '../src/repository/repository-errors'

class FakePatchBuilder {
  private patchArgs: unknown = undefined
  private whereArgs: unknown[][] = []
  private resolveValue: unknown = 1

  setResolveValue(v: unknown): void {
    this.resolveValue = v
  }

  getPatchArgs(): unknown {
    return this.patchArgs
  }

  getWhereArgs(): unknown[][] {
    return this.whereArgs
  }

  patch(data: unknown): this {
    this.patchArgs = data
    return this
  }

  where(...args: unknown[]): this {
    this.whereArgs.push(args)
    return this
  }

  patchAndFetchById(id: unknown, data: unknown): Promise<unknown> {
    this.patchArgs = data
    this.whereArgs.push(['id', id])
    return Promise.resolve({ id, ...((data as object) ?? {}) })
  }

  // biome-ignore lint/suspicious/noThenProperty: required for awaiting
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.resolveValue).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

let fakeBuilder = new FakePatchBuilder()

class FakeUserModel extends Model {
  static override tableName = 'users'
  static override idColumn = 'id'

  declare id: number
  declare name: string
  declare version: number

  static override query(): any {
    return fakeBuilder
  }

  static override propertyNameToColumnName(name: string): string {
    return name
  }

  static override columnNameToPropertyName(name: string): string {
    return name
  }
}

describe('ObjectionClient — optimistic locking', () => {
  beforeEach(() => {
    fakeBuilder = new FakePatchBuilder()
  })

  it('does a plain patchAndFetchById when versionField is not set', async () => {
    const client = new ObjectionClient(FakeUserModel as any)
    await client.update({ id: 1, name: 'Alice', version: 1 } as any)
    expect(fakeBuilder.getWhereArgs()).toContainEqual(['id', 1])
  })

  it('adds WHERE version clause and increments version when versionField is set', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    fakeBuilder.setResolveValue(1)
    await client.update({ id: 1, name: 'Alice', version: 3 } as any)
    expect(fakeBuilder.getWhereArgs()).toContainEqual(['id', 1])
    expect(fakeBuilder.getWhereArgs()).toContainEqual(['version', 3])
    const patchData = fakeBuilder.getPatchArgs() as Record<string, unknown>
    expect(patchData['version']).toBe(4)
    expect(patchData['name']).toBe('Alice')
  })

  it('throws OptimisticLockConflictError when affectedRows is 0', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    fakeBuilder.setResolveValue(0)
    await expect(client.update({ id: 1, name: 'Alice', version: 3 } as any)).rejects.toThrow(
      OptimisticLockConflictError
    )
  })

  it('throws if model is missing version field value', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    await expect(client.update({ id: 1, name: 'Alice' } as any)).rejects.toThrow(
      'ObjectionClient requires the version field "version" to be present for optimistic locking'
    )
  })
})
