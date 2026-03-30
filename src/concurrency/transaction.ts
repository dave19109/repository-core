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
