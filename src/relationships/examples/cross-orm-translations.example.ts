/**
 * Same canonical relationship expressed once, then translated to Objection and Prisma-shaped metadata.
 * Run-time: Objection needs real Model subclasses; Prisma fragment is dependency-free.
 */

import {
  canonicalToObjectionRelationMapping,
  type ObjectionResolveContext
} from '../../adapters/objection/canonical-to-objection'
import { type CanonicalRelationship, canonicalToPrismaRelationFragment, prismaRelationFragmentToString } from '../index'

/** ORM-neutral: User belongs to Person (FK on users). */
export const userToPersonManyToOne: CanonicalRelationship = {
  kind: 'manyToOne',
  name: 'person',
  sourceEntity: 'User',
  targetEntity: 'Person',
  foreignKey: {
    from: 'users.person_id',
    to: 'people.id'
  }
}

/** Example resolver: map logical names to Objection models (stubbed). */
export function objectionMappingExample(ctx: ObjectionResolveContext) {
  return canonicalToObjectionRelationMapping(userToPersonManyToOne, ctx)
}

export function prismaFragmentExample() {
  const fragment = canonicalToPrismaRelationFragment(userToPersonManyToOne)
  return {
    fragment,
    line: prismaRelationFragmentToString(fragment)
  }
}
