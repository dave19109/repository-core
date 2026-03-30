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
