# Concurrency & Race Condition Handling in ObjectionClient

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Add concurrency-safe primitives to `ObjectionClient` and `Repository`:

1. **Transactions** — atomic multi-operation blocks with rollback, supporting single-repo and cross-repo scenarios
2. **Optimistic Locking** — conflict detection via a configurable `versionField`, with automatic retry
3. **Pessimistic Locking** — `SELECT ... FOR UPDATE / FOR SHARE` via the existing `QueryBuilder`
4. **Retry** — built into `withTransaction` / `runInTransaction`, configurable per call

---

## Architecture

Three orthogonal features that compose cleanly over the existing layer:

```text
Repository
  ├── withTransaction(callback, retryPolicy?)  → manages trx lifecycle + retry
  └── withTrx(trx)                             → returns repo bound to external trx

ObjectionClient
  ├── withTrx(trx)   → clones client with knex Transaction bound
  └── all methods use modelClass.query(this.trx) when trx is present

runInTransaction(knex, callback, retryPolicy?)  → cross-repo utility

QueryBuilder (existing)
  └── .lock('for update' | 'for share')         → pessimistic locking hint

ObjectionClientOptions
  └── versionField?: keyof DomainQueryModel      → enables optimistic locking
```

---

## Section 1: Transactions

### Single-repo

`Repository` gains a `withTransaction` method. It starts a knex transaction, creates a transaction-bound clone of the internal `ObjectionClient` via `withTrx(trx)`, and passes a scoped version of itself to the callback. On success it commits; on error it rolls back and rethrows (or retries if the error is retryable and a `RetryPolicy` is provided).

```ts
await userRepo.withTransaction(
  async (txRepo) => {
    await txRepo.insert(user)
    await txRepo.update({ ...user, name: 'new' })
  },
  { maxAttempts: 3, backoff: 'exponential', baseDelayMs: 50 }
)
```

### Cross-repo

A standalone utility `runInTransaction(knex, callback, retryPolicy?)` starts a shared knex transaction and passes it to the callback. Each repository joins via `.withTrx(trx)`, which returns a transaction-scoped copy without modifying the original.

```ts
await runInTransaction(
  knex,
  async (trx) => {
    await userRepo.withTrx(trx).insert(user)
    await orderRepo.withTrx(trx).insert(order)
  },
  { maxAttempts: 3, backoff: 'exponential', baseDelayMs: 50 }
)
```

### RetryPolicy

```ts
interface RetryPolicy {
  maxAttempts: number          // total attempts including the first
  backoff?: 'linear' | 'exponential'
  baseDelayMs?: number         // default: 50ms
}
```

Retryable errors: `OptimisticLockConflictError`, DB serialization errors (Postgres `40001`, `40P01`).
Non-retryable: validation errors, mapping errors, constraint violations other than serialization.

---

## Section 2: Optimistic Locking

### Configuration

```ts
const client = new ObjectionClient(UserModel, { versionField: 'version' })
```

The `versionField` must be a property of `DomainQueryModel` / `PersistenceModel`. The field must exist as a numeric column in the database table.

### Behaviour

When `versionField` is set, `ObjectionClient.update()`:

1. Reads `model[versionField]` as `currentVersion`
2. Adds `WHERE id = ? AND version = currentVersion` to the update query
3. Increments `version` by 1 in the patch: `{ ...patch, version: currentVersion + 1 }`
4. If `affectedRows === 0` → throws `OptimisticLockConflictError`

```ts
// Internally translates to:
// UPDATE users SET name=?, version=2 WHERE id=? AND version=1
// affectedRows === 0 → OptimisticLockConflictError
```

`OptimisticLockConflictError` extends `RepositoryExecutionError` and is retryable by `withTransaction`.

### Caller responsibility

The caller must fetch the record first (to get the current `version`) before calling `update()`. The version is part of the model shape — no hidden state.

```ts
await userRepo.withTransaction(
  async (txRepo) => {
    const user = await txRepo.findById(id)   // includes version: 1
    await txRepo.update({ ...user, name: 'new' })  // WHERE version = 1, sets version = 2
  },
  { maxAttempts: 3, backoff: 'exponential', baseDelayMs: 50 }
)
```

---

## Section 3: Pessimistic Locking

### QueryBuilder extension

Add a `.lock()` method to the existing `QueryBuilder`:

```ts
type LockMode = 'for update' | 'for share'

queryBuilder.lock('for update')   // SELECT ... FOR UPDATE
queryBuilder.lock('for share')    // SELECT ... FOR SHARE
```

`lock()` is stored in `QueryModel` state and translated by `ObjectionQueryConverter` to `.forUpdate()` / `.forShare()` on the Objection query builder.

### Usage

Pessimistic locking is only meaningful inside a transaction. It is not enforced at the framework level — callers are responsible for using it within a `withTransaction` block.

```ts
await userRepo.withTransaction(async (txRepo) => {
  const user = await txRepo.findOne(q =>
    q.where('id', 'eq', id).lock('for update')
  )
  await txRepo.update({ ...user, balance: user.balance - 100 })
})
```

---

## Section 4: Error Hierarchy

```text
RepositoryError (existing)
  └── RepositoryExecutionError (existing)
        ├── OptimisticLockConflictError   — version field mismatch, retryable
        └── TransactionError              — wraps DB-level transaction failures (deadlock, serialization)
```

Serialization error codes wrapped into `TransactionError`:
- PostgreSQL: `40001` (serialization_failure), `40P01` (deadlock_detected)

Callers can catch `OptimisticLockConflictError` or `TransactionError` if they need to handle failures explicitly without relying on retry.

---

## Section 5: Testing Strategy

| Layer | Approach | What is verified |
| --- | --- | --- |
| `ObjectionClient.update()` (optimistic) | Unit — mock `affectedRows === 0` | `OptimisticLockConflictError` thrown |
| `ObjectionQueryConverter` (pessimistic) | Unit — inspect produced SQL/builder | `.forUpdate()` / `.forShare()` applied |
| `withTransaction` (single-repo) | Integration — SQLite in-memory | Commit on success, rollback on throw |
| `runInTransaction` (cross-repo) | Integration — SQLite in-memory | Atomicity across two models |
| Retry logic | Unit — mock retryable errors | Correct attempts count, backoff timing, non-retryable errors not retried |

---

## Out of Scope

- Savepoints / nested transactions
- Distributed transactions
- Retry on non-transaction operations (e.g. standalone `findAll`)
