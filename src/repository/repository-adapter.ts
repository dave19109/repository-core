/**
 * Bidirectional mapper between persistence records and domain-facing records.
 */
export abstract class RepositoryMapper<PersistenceModel extends object, DomainRecord extends object> {
  abstract toPersistence(domain: DomainRecord): PersistenceModel
  abstract toDomain(persistence: PersistenceModel): DomainRecord
}
