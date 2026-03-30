import { withRetry } from '../../src/concurrency/retry'
import { OptimisticLockConflictError, TransactionError } from '../../src/repository/repository-errors'

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
        if (attempts < 3) {
          throw new OptimisticLockConflictError('conflict')
        }
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
        if (attempts < 2) {
          throw new TransactionError('deadlock')
        }
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

  it('uses exponential backoff (delays increase)', async () => {
    const delays: number[] = []
    const originalSetTimeout = global.setTimeout
    global.setTimeout = ((fn: () => void, ms: number) => {
      delays.push(ms)
      return originalSetTimeout(fn, 0) // run immediately for test speed
    }) as typeof global.setTimeout

    let attempts = 0
    try {
      await withRetry(
        () => {
          attempts++
          if (attempts < 3) {
            throw new OptimisticLockConflictError('c')
          }
          return Promise.resolve('x')
        },
        { maxAttempts: 3, backoff: 'exponential', baseDelayMs: 100 }
      )
    } finally {
      global.setTimeout = originalSetTimeout
    }

    expect(delays).toHaveLength(2)
    expect(delays[1]).toBeGreaterThan(delays[0])
  })
})
