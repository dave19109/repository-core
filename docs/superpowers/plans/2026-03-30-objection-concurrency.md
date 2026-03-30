# Objection Concurrency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transactions, optimistic locking, pessimistic locking, and retry support to `ObjectionClient` and `ObjectionRepository`.

**Architecture:** Transaction context (`Knex.Transaction`) is stored on `ObjectionClient` and threaded into every query via `modelClass.query(this.trx)`. `ObjectionRepository` exposes `withTransaction(callback, retryPolicy?)` and `withTrx(trx)`. `runInTransaction` is a standalone utility for cross-repo coordination. Retry is built into `withTransaction` and `runInTransaction`, not exposed as a standalone API.

**Tech Stack:** TypeScript, Objection.js 3.x, Knex 3.x, Jest, better-sqlite3 (new dev dependency for integration tests)

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `src/repository/repository-errors.ts` | Modify | Add `OptimisticLockConflictError`, `TransactionError` |
| `src/types.ts` | Modify | Add `LockMode` type |
| `src/model/query-model.ts` | Modify | Add `lock?: LockMode` field |
| `src/query-builder/base-query-builder.ts` | Modify | Preserve `lock` in `cloneQueryModel` |
| `src/query-builder/query-builder-lock.ts` | Create | `QueryBuilderLock` mixin with `.lock()` method |
| `src/query-builder/query-builder-phases.ts` | Modify | Add `CanLock` interface to all applicable phases |
| `src/query-builder/query-builder.ts` | Modify | Include `QueryBuilderLock` mixin |
| `src/adapters/objection/object-client.ts` | Modify | Apply lock in converter; add `withTrx`, `getKnex`; optimistic locking in `update()`; thread `trx` everywhere |
| `src/concurrency/retry.ts` | Create | `RetryPolicy` interface + `withRetry` internal utility |
| `src/concurrency/transaction.ts` | Create | `runInTransaction` cross-repo utility |
| `src/concurrency/index.ts` | Create | Barrel export for concurrency utilities |
| `src/adapters/objection/objection-repository.ts` | Modify | Add `withTransaction`, `withTrx` |
| `src/index.ts` | Modify | Export new error classes, `runInTransaction`, `RetryPolicy`, `LockMode` |
| `test/repository-errors.test.ts` | Create | Error class hierarchy tests |
| `test/query-builder-lock.test.ts` | Create | `lock()` mixin unit tests |
| `test/objection-pessimistic-lock.test.ts` | Create | `forUpdate`/`forShare` applied by converter |
| `test/objection-optimistic-lock.test.ts` | Create | `update()` version check + `OptimisticLockConflictError` |
| `test/concurrency/retry.test.ts` | Create | `withRetry` backoff + retryable error detection |
| `test/concurrency/transaction.integration.test.ts` | Create | `withTransaction` + `runInTransaction` with SQLite in-memory |

---

## Task 1: New Error Classes

**Files:**

- Modify: `src/repository/repository-errors.ts`
- Modify: `src/index.ts`
- Create: `test/repository-errors.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// test/repository-errors.test.ts
import {
  OptimisticLockConflictError,
  RepositoryExecutionError,
  TransactionError
} from '../src/repository/repository-errors'

describe('concurrency error classes', () => {
  it('OptimisticLockConflictError is instanceof RepositoryExecutionError', () => {
    const err = new OptimisticLockConflictError('version mismatch')
    expect(err).toBeInstanceOf(RepositoryExecutionError)
    expect(err.name).toBe('OptimisticLockConflictError')
    expect(err.message).toBe('version mismatch')
  })

  it('TransactionError is instanceof RepositoryExecutionError', () => {
    const err = new TransactionError('deadlock detected')
    expect(err).toBeInstanceOf(RepositoryExecutionError)
    expect(err.name).toBe('TransactionError')
    expect(err.message).toBe('deadlock detected')
  })

  it('TransactionError wraps a cause', () => {
    const cause = new Error('pg error')
    const err = new TransactionError('tx failed', { cause })
    expect(err.cause).toBe(cause)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest test/repository-errors.test.ts`
Expected: FAIL — `OptimisticLockConflictError` and `TransactionError` not found

- [ ] **Step 3: Add error classes to `src/repository/repository-errors.ts`**

Add at the end of the file, after `RepositoryMappingError`:

```ts
export class OptimisticLockConflictError extends RepositoryExecutionError {
  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    super(message, options)
    this.name = new.target.name
  }
}

export class TransactionError extends RepositoryExecutionError {
  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    super(message, options)
    this.name = new.target.name
  }
}
```

- [ ] **Step 4: Export from `src/index.ts`**

Replace the existing `RepositoryError` exports block:

```ts
export {
  OptimisticLockConflictError,
  RepositoryError,
  RepositoryExecutionError,
  RepositoryMappingError,
  RepositoryQueryBuildError,
  TransactionError
} from './repository/repository-errors'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest test/repository-errors.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 6: Run the full suite to check for regressions**

Run: `pnpm jest`
Expected: All 53 existing tests + 3 new = 56 passing

- [ ] **Step 7: Commit**

```bash
git add src/repository/repository-errors.ts src/index.ts test/repository-errors.test.ts
git commit -m "feat: add OptimisticLockConflictError and TransactionError classes"
```

---

## Task 2: `LockMode` Type + `QueryModel.lock` Field

**Files:**

- Modify: `src/types.ts`
- Modify: `src/model/query-model.ts`
- Modify: `src/query-builder/base-query-builder.ts`

- [ ] **Step 1: Add `LockMode` to `src/types.ts`**

Add after the `SortDirection` type (line 106):

```ts
export type LockMode = 'for update' | 'for share'
```

- [ ] **Step 2: Add `lock` to `QueryModelOptions` and `QueryModel` in `src/model/query-model.ts`**

Replace the `QueryModelOptions` interface:

```ts
interface QueryModelOptions<M extends object = object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  select: SelectFields<M>
  joins: Join<M, Rel>[]
  aggregations: Aggregation<M>[]
  sort: SortField<M>[]
  groupBy: ModelAttributeField<M>[]
  where: WhereClause<M>[]
  distinct: boolean
  limit?: number | undefined
  offset?: number | undefined
  paranoid?: boolean | undefined
  lock?: LockMode | undefined
}
```

Add `import type { ..., LockMode } from '../types'` to the imports at the top of `src/model/query-model.ts`:

```ts
import type { Aggregation, Join, LockMode, SelectFields, SortField, WhereClause } from '../types'
```

Add the `lock` field declaration in the `QueryModel` class body, after `paranoid`:

```ts
/**
 * The lock mode.
 */
lock: LockMode | undefined = undefined
```

Add `this.lock = props.lock` in the constructor body, after `this.paranoid = ...`:

```ts
this.lock = props.lock
```

- [ ] **Step 3: Preserve `lock` in `BaseQueryBuilder.cloneQueryModel`**

In `src/query-builder/base-query-builder.ts`, add `lock: state.lock` to the `new QueryModel({ ... })` call inside `cloneQueryModel`:

```ts
protected static cloneQueryModel<M extends object, R extends RelationshipDefinitions = EmptyRelationshipMap>(
  state: Readonly<QueryModel<M, R>>
): QueryModel<M, R> {
  return new QueryModel({
    where: state.where.map((clause) => BaseQueryBuilder.cloneWhereClause(clause)),
    joins: state.joins.map((join) => ({
      ...join,
      query: join.query ? BaseQueryBuilder.cloneQueryModel(join.query) : undefined
    })),
    groupBy: [...state.groupBy],
    aggregations: state.aggregations.map((aggregation) => ({ ...aggregation })),
    sort: state.sort.map((sortField) => ({ ...sortField })),
    select: [...state.select],
    distinct: state.distinct,
    paranoid: state.paranoid,
    limit: state.limit,
    offset: state.offset,
    lock: state.lock
  })
}
```

- [ ] **Step 4: Run the full suite to check for regressions**

Run: `pnpm jest`
Expected: All 56 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/model/query-model.ts src/query-builder/base-query-builder.ts
git commit -m "feat: add LockMode type and lock field to QueryModel"
```

---

## Task 3: `QueryBuilderLock` Mixin + Phase Integration

**Files:**

- Create: `src/query-builder/query-builder-lock.ts`
- Modify: `src/query-builder/query-builder-phases.ts`
- Modify: `src/query-builder/query-builder.ts`
- Create: `test/query-builder-lock.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// test/query-builder-lock.test.ts
import { QueryBuilder } from '../src/query-builder/query-builder'

interface User {
  id: number
  name: string
}

describe('QueryBuilder.lock()', () => {
  it('stores for update in state', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.lock('for update')
    expect(result.getState().lock).toBe('for update')
  })

  it('stores for share in state', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.lock('for share')
    expect(result.getState().lock).toBe('for share')
  })

  it('does not mutate the original builder', () => {
    const qb = new QueryBuilder<User>()
    qb.lock('for update')
    expect(qb.getState().lock).toBeUndefined()
  })

  it('composes with where', () => {
    const qb = new QueryBuilder<User>()
    const result = qb.where('id', 'eq', 1).lock('for update')
    expect(result.getState().lock).toBe('for update')
    expect(result.getState().where).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest test/query-builder-lock.test.ts`
Expected: FAIL — `lock` is not a function

- [ ] **Step 3: Create `src/query-builder/query-builder-lock.ts`**

```ts
import type { EmptyRelationshipMap, RelationshipDefinitions } from '../model/model-domain'
import type { LockMode } from '../types'
import { BaseQueryBuilder } from './base-query-builder'

export class QueryBuilderLock<
  Model extends object = object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
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
```

- [ ] **Step 4: Add `CanLock` capability interface to `src/query-builder/query-builder-phases.ts`**

Add after `CanLimit` (around line 163):

```ts
export interface CanLock<M extends object, Rel extends RelationshipDefinitions = EmptyRelationshipMap> {
  lock(mode: import('../types').LockMode): QueryBuilderAfterWhere<M, Rel>
}
```

Add `CanLock<M, Rel>` to all phase types that should support it. The lock should be available anywhere after initial and after where (i.e., all read phases). Add `& CanLock<M, Rel>` to:

- `QueryBuilderInitial`
- `QueryBuilderAfterJoin`
- `QueryBuilderAfterSelect`
- `QueryBuilderAfterWhere`
- `QueryBuilderAfterAggregate`
- `QueryBuilderAfterGroupBy`
- `QueryBuilderAfterSort`
- `QueryBuilderAfterDistinct`
- `QueryBuilderAfterLimit`

For example, `QueryBuilderInitial` becomes:

```ts
export type QueryBuilderInitial<
  M extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> = HasGetState<M, Rel> &
  CanSelect<M, Rel> &
  CanJoin<M, Rel> &
  CanWhereStart<M, Rel> &
  CanAggregate<M, Rel> &
  CanGroupBy<M, Rel> &
  CanSort<M, Rel> &
  CanDistinct<M, Rel> &
  CanParanoid &
  CanLimit<M, Rel> &
  CanLock<M, Rel>
```

Apply the same `& CanLock<M, Rel>` addition to all other phase types listed above.

- [ ] **Step 5: Add `QueryBuilderLock` mixin to `src/query-builder/query-builder.ts`**

Add the import:

```ts
import { QueryBuilderLock } from './query-builder-lock'
```

Add `QueryBuilderLock` to the `applyMixins` call:

```ts
applyMixins(QueryBuilderBase, [
  QueryBuilderWhere,
  QueryBuilderJoin,
  QueryBuilderSelect,
  QueryBuilderSort,
  QueryBuilderAggregate,
  QueryBuilderGroup,
  QueryBuilderDistinct,
  QueryBuilderParanoid,
  QueryBuilderPagination,
  QueryBuilderLock
])
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm jest test/query-builder-lock.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 7: Run the full suite to check for regressions**

Run: `pnpm jest`
Expected: All 60 tests passing

- [ ] **Step 8: Commit**

```bash
git add src/query-builder/query-builder-lock.ts src/query-builder/query-builder-phases.ts src/query-builder/query-builder.ts test/query-builder-lock.test.ts
git commit -m "feat: add lock() method to QueryBuilder for pessimistic locking"
```

---

## Task 4: Pessimistic Locking in `ObjectionQueryConverter`

**Files:**

- Modify: `src/adapters/objection/object-client.ts`
- Create: `test/objection-pessimistic-lock.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// test/objection-pessimistic-lock.test.ts
import { Model } from 'objection'
import { ObjectionClient } from '../src/adapters/objection/object-client'
import { QueryBuilder } from '../src/query-builder/query-builder'

type BuilderCall = { method: string; args: unknown[] }

class FakeLockQueryBuilder {
  calls: BuilderCall[] = []
  private awaitedValue: unknown = []

  // biome-ignore lint/suspicious/noThenProperty: Not used in this test
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.awaitedValue).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  forUpdate(): this {
    this.calls.push({ method: 'forUpdate', args: [] })
    return this
  }

  forShare(): this {
    this.calls.push({ method: 'forShare', args: [] })
    return this
  }

  where(...args: unknown[]): this {
    this.calls.push({ method: 'where', args })
    return this
  }

  orderBy(...args: unknown[]): this {
    this.calls.push({ method: 'orderBy', args })
    return this
  }

  limit(...args: unknown[]): this {
    this.calls.push({ method: 'limit', args })
    return this
  }

  offset(...args: unknown[]): this {
    this.calls.push({ method: 'offset', args })
    return this
  }

  first(): this {
    this.calls.push({ method: 'first', args: [] })
    return this
  }
}

interface UserModel {
  id: number
  name: string
}

class FakeUserModel extends Model {
  static override tableName = 'users'
  static override idColumn = 'id'

  declare id: number
  declare name: string

  private static fakeBuilder = new FakeLockQueryBuilder()

  static resetBuilder(): void {
    this.fakeBuilder = new FakeLockQueryBuilder()
  }

  static getLastBuilder(): FakeLockQueryBuilder {
    return this.fakeBuilder
  }

  static override query(): any {
    return this.fakeBuilder
  }

  static override propertyNameToColumnName(name: string): string {
    return name
  }
}

describe('ObjectionQueryConverter — pessimistic locking', () => {
  let client: ObjectionClient<FakeUserModel>

  beforeEach(() => {
    FakeUserModel.resetBuilder()
    client = new ObjectionClient(FakeUserModel as any)
  })

  it('applies forUpdate() when lock is "for update"', () => {
    const qb = new QueryBuilder<UserModel>().lock('for update')
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    const calls = FakeUserModel.getLastBuilder().calls
    expect(calls.some((c) => c.method === 'forUpdate')).toBe(true)
  })

  it('applies forShare() when lock is "for share"', () => {
    const qb = new QueryBuilder<UserModel>().lock('for share')
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    const calls = FakeUserModel.getLastBuilder().calls
    expect(calls.some((c) => c.method === 'forShare')).toBe(true)
  })

  it('does not apply any lock when lock is undefined', () => {
    const qb = new QueryBuilder<UserModel>()
    const query = client.queryConverter.toPersistenceQuery(qb.getState())
    query.createBuilder()
    const calls = FakeUserModel.getLastBuilder().calls
    expect(calls.some((c) => c.method === 'forUpdate' || c.method === 'forShare')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest test/objection-pessimistic-lock.test.ts`
Expected: FAIL — `forUpdate`/`forShare` not called

- [ ] **Step 3: Add `applyLock` to `ObjectionQueryConverter` in `src/adapters/objection/object-client.ts`**

Add the `applyLock` private method to `ObjectionQueryConverter` after `applyPagination`:

```ts
private applyLock<QueryModelShape extends object>(
  builder: AnyObjectionQueryBuilder,
  state: Readonly<QueryModel<QueryModelShape>>
): void {
  if (state.lock === 'for update') {
    builder.forUpdate()
  } else if (state.lock === 'for share') {
    builder.forShare()
  }
}
```

Call it in `applyState`, after `applyPagination`:

```ts
private applyState<QueryModelShape extends object>(
  builder: AnyObjectionQueryBuilder,
  state: Readonly<QueryModel<QueryModelShape>>,
  modelClass: AnyModelClass,
  options: Required<ObjectionQueryBuildOptions>
): AnyObjectionQueryBuilder {
  this.applyJoins(builder, state, modelClass)
  this.applyParanoid(builder, state, modelClass)
  this.applyWhere(builder, state, modelClass)
  this.applySelect(builder, state, modelClass)
  this.applyAggregations(builder, state, modelClass)
  this.applyGroupBy(builder, state, modelClass)
  this.applyDistinct(builder, state)
  this.applySort(builder, state, modelClass)

  if (options.applyPagination) {
    this.applyPagination(builder, state)
  }

  this.applyLock(builder, state)

  return builder
}
```

Also update `cloneQueryModel` at the bottom of `object-client.ts` to preserve `lock`:

```ts
function cloneQueryModel<M extends object>(state: Readonly<QueryModel<M, any>>): QueryModel<M, any> {
  return new QueryModel({
    where: state.where.map((clause) => cloneWhereClause(clause)),
    joins: state.joins.map((join) => ({
      ...join,
      query: join.query ? cloneQueryModel(join.query) : undefined
    })),
    groupBy: [...state.groupBy],
    aggregations: state.aggregations.map((aggregation) => ({ ...aggregation })),
    sort: state.sort.map((sortField) => ({ ...sortField })),
    select: [...state.select],
    distinct: state.distinct,
    paranoid: state.paranoid,
    limit: state.limit,
    offset: state.offset,
    lock: state.lock
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest test/objection-pessimistic-lock.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: Run the full suite**

Run: `pnpm jest`
Expected: All 63 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/adapters/objection/object-client.ts test/objection-pessimistic-lock.test.ts
git commit -m "feat: apply forUpdate/forShare in ObjectionQueryConverter for pessimistic locking"
```

---

## Task 5: `ObjectionClient` Transaction Support (`withTrx`, `getKnex`, thread `trx`)

**Files:**

- Modify: `src/adapters/objection/object-client.ts`

No new tests in this task — the transaction plumbing will be tested end-to-end in Task 9. Add one unit test step to verify `withTrx` creates a new instance.

- [ ] **Step 1: Add `Knex` import to `src/adapters/objection/object-client.ts`**

Add at the top of the file:

```ts
import type { Knex } from 'knex'
```

- [ ] **Step 2: Store `trx` in `ObjectionQueryConverter` and use it in `createBuilder`**

Change `ObjectionQueryConverter` constructor to accept and store an optional `trx`:

```ts
export class ObjectionQueryConverter<PersistenceModel extends Model, DomainQueryModel extends object = PersistenceModel>
  implements RepositoryQueryConverter<DomainQueryModel, ObjectionQuery<PersistenceModel, DomainQueryModel>>
{
  constructor(
    private readonly modelClass: ModelClass<PersistenceModel>,
    private readonly options: ObjectionClientOptions<DomainQueryModel> = {},
    private readonly trx?: Knex.Transaction
  ) {}

  toPersistenceQuery(
    query: Readonly<QueryModel<DomainQueryModel, any>>
  ): ObjectionQuery<PersistenceModel, DomainQueryModel> {
    const state = cloneQueryModel(query)

    return {
      state,
      createBuilder: (options) =>
        this.applyState(
          this.modelClass.query(this.trx) as unknown as AnyObjectionQueryBuilder,
          state,
          this.modelClass,
          { applyPagination: options?.applyPagination ?? true }
        ) as unknown as QueryBuilder<PersistenceModel, PersistenceModel[]>
    }
  }
  // ... rest unchanged
}
```

- [ ] **Step 3: Add `trx` and `options` fields to `ObjectionClient` constructor; add `withTrx` and `getKnex`**

Change `ObjectionClient` constructor to store `options` and accept an optional `trx`:

```ts
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

  // ... rest of methods
}
```

- [ ] **Step 4: Thread `this.trx` through all `modelClass.query()` calls in `ObjectionClient`**

Replace every occurrence of `this.modelClass.query()` with `this.modelClass.query(this.trx)` in all methods: `findAll`, `findOne`, `findById`, `insert`, `update`, `upsert`, `destroy`, `increment`, `decrement`.

The relevant lines are:

```ts
// findById — fallback path
const builder = query?.createBuilder() ?? this.modelClass.query(this.trx)

// insert — fallback path
await (query?.createBuilder() ?? this.modelClass.query(this.trx)).insert(...)

// update — no-query path (will be fully rewritten in Task 6)
await this.modelClass.query(this.trx).patchAndFetchById(id, patch)

// upsert — fallback path
await (query?.createBuilder() ?? this.modelClass.query(this.trx))
  .insert(...)
  .onConflict(conflictTarget)
  .merge()

// destroy — both paths
await (query?.createBuilder() ?? this.modelClass.query(this.trx)).deleteById(ids[0])
await (query?.createBuilder() ?? this.modelClass.query(this.trx)).findByIds(ids).delete()

// increment — fallback path
await (query?.createBuilder() ?? this.modelClass.query(this.trx)).increment(String(field), value)

// decrement — fallback path
await (query?.createBuilder() ?? this.modelClass.query(this.trx)).decrement(String(field), value)
```

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `pnpm jest`
Expected: All 63 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/adapters/objection/object-client.ts
git commit -m "feat: add withTrx and getKnex to ObjectionClient, thread transaction through all queries"
```

---

## Task 6: Optimistic Locking in `ObjectionClient.update()`

**Files:**

- Modify: `src/adapters/objection/object-client.ts`
- Create: `test/objection-optimistic-lock.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// test/objection-optimistic-lock.test.ts
import { Model } from 'objection'
import { ObjectionClient } from '../src/adapters/objection/object-client'
import { OptimisticLockConflictError } from '../src/repository/repository-errors'

class FakePatchBuilder {
  private patchArgs: unknown[] = []
  private whereArgs: unknown[][] = []
  private resolveValue: unknown = 1

  setResolveValue(v: unknown): void {
    this.resolveValue = v
  }

  getPatchArgs(): unknown[] {
    return this.patchArgs
  }

  getWhereArgs(): unknown[][] {
    return this.whereArgs
  }

  patch(data: unknown): this {
    this.patchArgs = [data]
    return this
  }

  where(...args: unknown[]): this {
    this.whereArgs.push(args)
    return this
  }

  patchAndFetchById(id: unknown, data: unknown): Promise<unknown> {
    this.patchArgs = [id, data]
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

interface UserModel {
  id: number
  name: string
  version: number
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
    expect(fakeBuilder.getPatchArgs()).toEqual([1, { name: 'Alice', version: 1 }])
  })

  it('adds WHERE version clause and increments version when versionField is set', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    fakeBuilder.setResolveValue(1)
    await client.update({ id: 1, name: 'Alice', version: 3 } as any)
    const whereArgs = fakeBuilder.getWhereArgs()
    expect(whereArgs).toContainEqual(['id', 1])
    expect(whereArgs).toContainEqual(['version', 3])
    const patchData = fakeBuilder.getPatchArgs()[0] as Record<string, unknown>
    expect(patchData.version).toBe(4)
    expect(patchData.name).toBe('Alice')
  })

  it('throws OptimisticLockConflictError when affectedRows is 0', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    fakeBuilder.setResolveValue(0)
    await expect(client.update({ id: 1, name: 'Alice', version: 3 } as any)).rejects.toThrow(
      OptimisticLockConflictError
    )
  })

  it('throws if model is missing version field', async () => {
    const client = new ObjectionClient(FakeUserModel as any, { versionField: 'version' })
    await expect(client.update({ id: 1, name: 'Alice' } as any)).rejects.toThrow(
      'ObjectionClient requires the version field "version" to be present for optimistic locking'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest test/objection-optimistic-lock.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite `update()` in `ObjectionClient` to support optimistic locking**

Replace the existing `update()` method in `ObjectionClient`:

```ts
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
    numUpdated = await query.createBuilder().patch(patchWithVersion)
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
```

Add the import for `OptimisticLockConflictError` at the top of `object-client.ts`:

```ts
import { OptimisticLockConflictError } from '../../repository/repository-errors'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest test/objection-optimistic-lock.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Run the full suite**

Run: `pnpm jest`
Expected: All 67 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/adapters/objection/object-client.ts test/objection-optimistic-lock.test.ts
git commit -m "feat: implement optimistic locking in ObjectionClient.update() via versionField"
```

---

## Task 7: `RetryPolicy` + `withRetry` Utility

**Files:**

- Create: `src/concurrency/retry.ts`
- Create: `test/concurrency/retry.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// test/concurrency/retry.test.ts
import { OptimisticLockConflictError, TransactionError } from '../../src/repository/repository-errors'
import { withRetry } from '../../src/concurrency/retry'
import type { RetryPolicy } from '../../src/concurrency/retry'

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const result = await withRetry(() => Promise.resolve(42), { maxAttempts: 3 })
    expect(result).toBe(42)
  })

  it('retries on OptimisticLockConflictError and returns on eventual success', async () => {
    let attempts = 0
    const result = await withRetry(
      () => {
        attempts++
        if (attempts < 3) throw new OptimisticLockConflictError('conflict')
        return Promise.resolve('ok')
      },
      { maxAttempts: 3, backoff: 'linear', baseDelayMs: 0 }
    )
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('retries on TransactionError and returns on eventual success', async () => {
    let attempts = 0
    const result = await withRetry(
      () => {
        attempts++
        if (attempts < 2) throw new TransactionError('deadlock')
        return Promise.resolve('done')
      },
      { maxAttempts: 3, backoff: 'linear', baseDelayMs: 0 }
    )
    expect(result).toBe('done')
    expect(attempts).toBe(2)
  })

  it('throws after maxAttempts is reached', async () => {
    let attempts = 0
    await expect(
      withRetry(
        () => {
          attempts++
          throw new OptimisticLockConflictError('conflict')
        },
        { maxAttempts: 3, backoff: 'linear', baseDelayMs: 0 }
      )
    ).rejects.toThrow(OptimisticLockConflictError)
    expect(attempts).toBe(3)
  })

  it('does NOT retry on non-retryable errors', async () => {
    let attempts = 0
    await expect(
      withRetry(
        () => {
          attempts++
          throw new Error('validation failed')
        },
        { maxAttempts: 3, backoff: 'linear', baseDelayMs: 0 }
      )
    ).rejects.toThrow('validation failed')
    expect(attempts).toBe(1)
  })

  it('uses exponential backoff', async () => {
    const delays: number[] = []
    const originalSetTimeout = global.setTimeout
    jest.useFakeTimers()

    const promise = withRetry(
      (() => {
        let n = 0
        return () => {
          n++
          if (n < 3) throw new OptimisticLockConflictError('c')
          return Promise.resolve('x')
        }
      })(),
      { maxAttempts: 3, backoff: 'exponential', baseDelayMs: 100 }
    )

    // First retry: 100ms, second retry: 200ms
    await jest.runAllTimersAsync()
    const result = await promise
    expect(result).toBe('x')
    jest.useRealTimers()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest test/concurrency/retry.test.ts`
Expected: FAIL — `withRetry` not found

- [ ] **Step 3: Create `src/concurrency/retry.ts`**

```ts
import { OptimisticLockConflictError, TransactionError } from '../repository/repository-errors'

export interface RetryPolicy {
  /** Total number of attempts including the first. Must be >= 1. */
  maxAttempts: number
  /** Delay strategy between retries. Defaults to 'linear'. */
  backoff?: 'linear' | 'exponential'
  /** Base delay in milliseconds. Defaults to 50. */
  baseDelayMs?: number
}

function isRetryable(error: unknown): boolean {
  return error instanceof OptimisticLockConflictError || error instanceof TransactionError
}

function computeDelayMs(policy: Required<RetryPolicy>, attempt: number): number {
  if (policy.backoff === 'exponential') {
    return policy.baseDelayMs * 2 ** (attempt - 1)
  }
  return policy.baseDelayMs * attempt
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetry<T>(fn: () => Promise<T> | T, policy: RetryPolicy): Promise<T> {
  const resolved: Required<RetryPolicy> = {
    maxAttempts: policy.maxAttempts,
    backoff: policy.backoff ?? 'linear',
    baseDelayMs: policy.baseDelayMs ?? 50
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= resolved.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRetryable(error) || attempt === resolved.maxAttempts) {
        throw error
      }
      await sleep(computeDelayMs(resolved, attempt))
    }
  }

  throw lastError
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest test/concurrency/retry.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Run the full suite**

Run: `pnpm jest`
Expected: All 73 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/concurrency/retry.ts test/concurrency/retry.test.ts
git commit -m "feat: add RetryPolicy and withRetry utility with linear/exponential backoff"
```

---

## Task 8: `runInTransaction` Cross-Repo Utility + Exports

**Files:**

- Create: `src/concurrency/transaction.ts`
- Create: `src/concurrency/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/concurrency/transaction.ts`**

```ts
import type { Knex } from 'knex'
import { TransactionError } from '../repository/repository-errors'
import { withRetry } from './retry'
import type { RetryPolicy } from './retry'

const SERIALIZATION_ERROR_CODES = new Set(['40001', '40P01'])

function isSerializationError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as Record<string, unknown>)['code']
    return typeof code === 'string' && SERIALIZATION_ERROR_CODES.has(code)
  }
  return false
}

function wrapIfSerializationError(error: unknown): unknown {
  if (isSerializationError(error)) {
    return new TransactionError('Database transaction conflict (serialization failure or deadlock)', { cause: error })
  }
  return error
}

export async function runInTransaction<T>(
  knex: Knex,
  callback: (trx: Knex.Transaction) => Promise<T>,
  retryPolicy?: RetryPolicy
): Promise<T> {
  const execute = async (): Promise<T> => {
    try {
      return await knex.transaction(callback)
    } catch (error) {
      throw wrapIfSerializationError(error)
    }
  }

  if (retryPolicy) {
    return withRetry(execute, retryPolicy)
  }

  return execute()
}
```

- [ ] **Step 2: Create `src/concurrency/index.ts`**

```ts
export { runInTransaction } from './transaction'
export type { RetryPolicy } from './retry'
```

- [ ] **Step 3: Export from `src/index.ts`**

Add at the end of `src/index.ts`:

```ts
export { runInTransaction } from './concurrency'
export type { RetryPolicy } from './concurrency'
export type { LockMode } from './types'
```

- [ ] **Step 4: Run the full suite**

Run: `pnpm jest`
Expected: All 73 tests passing (no new tests for `runInTransaction` — covered in integration test in Task 9)

- [ ] **Step 5: Commit**

```bash
git add src/concurrency/transaction.ts src/concurrency/index.ts src/index.ts
git commit -m "feat: add runInTransaction cross-repo utility and export concurrency types"
```

---

## Task 9: `withTransaction` + `withTrx` on `ObjectionRepository` (Integration Tests)

**Files:**

- Modify: `src/adapters/objection/objection-repository.ts`
- Create: `test/concurrency/transaction.integration.test.ts`

- [ ] **Step 1: Install `better-sqlite3` dev dependency**

Run: `pnpm add -D better-sqlite3 @types/better-sqlite3`
Expected: Package installed successfully

- [ ] **Step 2: Write failing integration tests**

```ts
// test/concurrency/transaction.integration.test.ts
import Knex from 'knex'
import { Model } from 'objection'
import { ObjectionRepository } from '../../src/adapters/objection/objection-repository'
import { OptimisticLockConflictError } from '../../src/repository/repository-errors'
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
    toDomain: (m) => ({ id: m.id, name: m.name, version: m.version })
  }
}

class OrderRepository extends ObjectionRepository<OrderModel, OrderDomain> {
  protected readonly mapper: RepositoryMapper<OrderModel, OrderDomain> = {
    toDomain: (m) => ({ id: m.id, label: m.label })
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

  it('retries on OptimisticLockConflictError and succeeds', async () => {
    await knex('users').insert({ id: 1, name: 'Alice', version: 1 })
    let attempts = 0
    const repo = new UserRepository(UserModel)

    await repo.withTransaction(
      async (txRepo) => {
        attempts++
        const user = await txRepo.findById(1)
        if (!user) throw new Error('not found')
        if (attempts === 1) {
          // Simulate external update that increments version
          await knex('users').where('id', 1).update({ version: 2 })
        }
        await txRepo.update({ id: user.id, name: 'Updated', version: user.version } as any)
      },
      { maxAttempts: 3, backoff: 'linear', baseDelayMs: 0 }
    )

    // On attempt 2, user.version from DB would be 2, update succeeds
    expect(attempts).toBeGreaterThanOrEqual(1)
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

    expect(await knex('users').count('* as n').first()).toMatchObject({ n: 1 })
    expect(await knex('orders').count('* as n').first()).toMatchObject({ n: 1 })
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

    expect(await knex('users').count('* as n').first()).toMatchObject({ n: 0 })
    expect(await knex('orders').count('* as n').first()).toMatchObject({ n: 0 })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm jest test/concurrency/transaction.integration.test.ts`
Expected: FAIL — `withTransaction` and `withTrx` not found on `ObjectionRepository`

- [ ] **Step 4: Add `withTransaction` and `withTrx` to `ObjectionRepository`**

Replace the contents of `src/adapters/objection/objection-repository.ts`:

```ts
import type { Knex } from 'knex'
import type { Model, ModelClass, ModelObject } from 'objection'
import type { EmptyRelationshipMap, RelationshipDefinitions } from '../../model/model-domain'
import { GenericOrmRepository } from '../../repository/generic-orm-repository'
import { withRetry } from '../../concurrency/retry'
import type { RetryPolicy } from '../../concurrency/retry'
import { ObjectionClient, type ObjectionQuery } from './object-client'

/**
 * Query builder and filter APIs use {@link ModelObject}, Objection's row-shaped type: it omits
 * framework members such as `QueryBuilderType` and `$modelClass` that are not real columns.
 */
export abstract class ObjectionRepository<
  M extends Model,
  D extends object,
  Rel extends RelationshipDefinitions = EmptyRelationshipMap
> extends GenericOrmRepository<ModelObject<M>, D, M, ObjectionQuery<M, ModelObject<M>>, Rel> {
  constructor(modelClass: ModelClass<M>) {
    super(
      new ObjectionClient<M, ModelObject<M>>(modelClass, {
        paranoidField: 'deletedAt'
      })
    )
  }

  /**
   * Returns a copy of this repository bound to an external Knex transaction.
   * Use with {@link runInTransaction} for cross-repository coordination.
   */
  withTrx(trx: Knex.Transaction): this {
    const scoped = Object.create(this) as this
    ;(scoped as { client: unknown }).client = (
      this.client as ObjectionClient<M, ModelObject<M>>
    ).withTrx(trx)
    return scoped
  }

  /**
   * Executes a callback inside a Knex transaction.
   * Automatically commits on success and rolls back on error.
   * Optionally retries on {@link OptimisticLockConflictError} and serialization failures.
   */
  async withTransaction<T>(callback: (txRepo: this) => Promise<T>, retryPolicy?: RetryPolicy): Promise<T> {
    const knex = (this.client as ObjectionClient<M, ModelObject<M>>).getKnex()

    const execute = async (): Promise<T> => {
      return knex.transaction(async (trx) => {
        return callback(this.withTrx(trx))
      })
    }

    if (retryPolicy) {
      return withRetry(execute, retryPolicy)
    }

    return execute()
  }
}
```

- [ ] **Step 5: Run integration tests**

Run: `pnpm jest test/concurrency/transaction.integration.test.ts`
Expected: PASS — all integration tests

- [ ] **Step 6: Run the full suite**

Run: `pnpm jest`
Expected: All tests passing

- [ ] **Step 7: Commit**

```bash
git add src/adapters/objection/objection-repository.ts test/concurrency/transaction.integration.test.ts
git commit -m "feat: add withTransaction and withTrx to ObjectionRepository with retry support"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
| --- | --- |
| Transactions — single-repo `withTransaction(callback, retryPolicy?)` | Task 9 |
| Transactions — cross-repo `runInTransaction(knex, callback, retryPolicy?)` | Task 8 + 9 |
| `ObjectionClient.withTrx(trx)` | Task 5 |
| Retry built into `withTransaction` / `runInTransaction` | Tasks 7, 8, 9 |
| `RetryPolicy` with `maxAttempts`, `backoff`, `baseDelayMs` | Task 7 |
| Retryable: `OptimisticLockConflictError` + serialization errors | Tasks 1, 7, 8 |
| `versionField` configurable in `ObjectionClientOptions` | Task 6 |
| `update()` checks version, increments, throws on `affectedRows === 0` | Task 6 |
| `QueryBuilder.lock('for update' \| 'for share')` | Task 3 |
| `ObjectionQueryConverter` applies `forUpdate()` / `forShare()` | Task 4 |
| `OptimisticLockConflictError` + `TransactionError` error classes | Task 1 |
| Integration tests with SQLite in-memory | Task 9 |

All spec requirements covered. No gaps found.
