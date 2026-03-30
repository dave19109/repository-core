/**
 * Repository-level error wrappers.
 *
 * Goal: add consistent context when failures happen during:
 * - query building (callbacks)
 * - ORM execution (client)
 * - mapping (persistence -> domain)
 */
export type RepositoryErrorContext = {
  operation?: string
  model?: string
}

export class RepositoryError extends Error {
  declare readonly context?: RepositoryErrorContext

  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    const { cause, context } = options ?? {}
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = new.target.name
    this.context = context
  }
}

export class RepositoryQueryBuildError extends RepositoryError {
  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    super(message, options)
    this.name = new.target.name
  }
}

export class RepositoryExecutionError extends RepositoryError {
  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    super(message, options)
    this.name = new.target.name
  }
}

export class RepositoryMappingError extends RepositoryError {
  constructor(message: string, options?: { cause?: unknown; context?: RepositoryErrorContext }) {
    super(message, options)
    this.name = new.target.name
  }
}
