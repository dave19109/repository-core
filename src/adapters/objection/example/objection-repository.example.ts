import { Model } from 'objection'
import type { RepositoryMapper } from '../../../repository/repository-adapter'
import { ObjectionRepository } from '../objection-repository'

class PersonDomain {
  id: string
  name: string
  age: number
  createdAt: Date
  updatedAt: Date
}

class PersonModel extends Model {
  id: string
  name: string
  age: number
  created_at: Date
  updated_at: Date
}

class UserDomain {
  id: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
  person?: PersonDomain
}

class UserModel extends Model {
  id: string
  name: string
  email: string
  password: string
  person_id: string
  created_at: Date
  updated_at: Date
}

export class PersonRepository extends ObjectionRepository<PersonModel, PersonDomain> {
  protected mapper: RepositoryMapper<PersonModel, PersonDomain> = {
    toDomain: (model) => ({
      id: model.id,
      name: model.name,
      age: model.age,
      createdAt: model.created_at,
      updatedAt: model.updated_at
    }),
    toPersistence: (domain) =>
      PersonModel.fromJson({
        id: domain.id,
        name: domain.name,
        age: domain.age,
        created_at: domain.createdAt,
        updated_at: domain.updatedAt
      })
  }
}

export class UserRepository extends ObjectionRepository<UserModel, UserDomain> {
  protected mapper: RepositoryMapper<UserModel, UserDomain> = {
    toDomain: (model) => ({
      id: model.id,
      name: model.name,
      email: model.email,
      password: model.password,
      createdAt: model.created_at,
      updatedAt: model.updated_at
    }),
    toPersistence: (domain) =>
      UserModel.fromJson({
        id: domain.id,
        email: domain.email,
        password: domain.password,
        person_id: domain.person?.id
      })
  }
}

//const userRepository = new UserRepository(UserModel)
//userRepository.findAll((query) => query.join('person', (person) => person.where('')))
