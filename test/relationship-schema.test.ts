import { Model } from 'objection'
import {
  canonicalToObjectionRelationMapping,
  type ObjectionResolveContext
} from '../src/adapters/objection/canonical-to-objection'
import { canonicalToPrismaRelationFragment, prismaRelationFragmentToString } from '../src/relationships/prisma-fragment'
import type { CanonicalRelationship } from '../src/relationships/schema'

class PersonModel extends Model {}
class PostModel extends Model {}
class TagModel extends Model {}
class UserTagModel extends Model {}

const ctx: ObjectionResolveContext = {
  resolveModel: (entity: string) => {
    if (entity === 'Person') {
      return PersonModel
    }
    if (entity === 'Post') {
      return PostModel
    }
    if (entity === 'Tag') {
      return TagModel
    }
    if (entity === 'UserTag') {
      return UserTagModel
    }
    throw new Error(`unknown entity ${entity}`)
  }
}

describe('Canonical relationship translations', () => {
  it('maps many-to-one to Objection BelongsToOne and Prisma fields', () => {
    const rel: CanonicalRelationship = {
      kind: 'manyToOne',
      name: 'person',
      sourceEntity: 'User',
      targetEntity: 'Person',
      foreignKey: { from: 'users.person_id', to: 'people.id' }
    }
    const mapping = canonicalToObjectionRelationMapping(rel, ctx)
    expect(mapping.relation.name).toBe('BelongsToOneRelation')
    expect(mapping.join).toEqual({ from: 'users.person_id', to: 'people.id' })

    const prisma = canonicalToPrismaRelationFragment(rel)
    expect(prisma.spec).toMatchObject({
      cardinality: 'manyToOne',
      fields: ['person_id'],
      references: ['id']
    })
    expect(prismaRelationFragmentToString(prisma)).toContain('@relation')
  })

  it('maps one-to-many to Objection HasMany', () => {
    const rel: CanonicalRelationship = {
      kind: 'oneToMany',
      name: 'posts',
      sourceEntity: 'User',
      targetEntity: 'Post',
      foreignKey: { from: 'users.id', to: 'posts.user_id' }
    }
    const mapping = canonicalToObjectionRelationMapping(rel, ctx)
    expect(mapping.relation.name).toBe('HasManyRelation')
  })

  it('maps many-to-many to Objection ManyToMany with through', () => {
    const rel: CanonicalRelationship = {
      kind: 'manyToMany',
      name: 'tags',
      sourceEntity: 'User',
      targetEntity: 'Tag',
      junction: {
        throughEntity: 'UserTag',
        sourceToJunction: { from: 'users.id', to: 'user_tags.user_id' },
        junctionToTarget: { from: 'user_tags.tag_id', to: 'tags.id' }
      }
    }
    const mapping = canonicalToObjectionRelationMapping(rel, ctx)
    expect(mapping.relation.name).toBe('ManyToManyRelation')
    expect(mapping.join).toMatchObject({
      from: 'users.id',
      to: 'tags.id',
      through: expect.objectContaining({
        from: 'user_tags.user_id',
        to: 'user_tags.tag_id',
        modelClass: UserTagModel
      })
    })
  })
})
