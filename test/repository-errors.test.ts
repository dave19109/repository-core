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
