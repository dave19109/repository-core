export type RelationshipKind = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'

/** Default relationship map when a model has no joins (second generic on `QueryBuilder`). */
export type EmptyRelationshipMap = Record<string, never>

/** Drops callables and class constructors (`typeof SomeClass`); plain object types are unchanged. */
type NonFunctionProperties<T extends object> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown
    ? never
    : T[K] extends abstract new (
          ...args: never[]
        ) => unknown
      ? never
      : K]: T[K]
}

/**
 * Typing-only description of a relation (cardinality + target); ORMs wire storage with their own metadata.
 */
export interface RelationshipModel<Source extends object, Target extends object, Kind extends RelationshipKind> {
  kind: Kind
  source?: Source
  target: Target
}

export type RelationshipDefinition = RelationshipModel<any, any, any>
export type RelationshipDefinitions = Record<string, RelationshipDefinition>

/**
 * Structural constraint for relationship maps: each key must map to `RelationshipDefinition`.
 * Prefer this over `extends RelationshipDefinitions` (`Record<string, ...>`) in generics so
 * object types with explicit keys (better editor suggestions) stay assignable without a string index signature.
 */
export type AsRelationshipDefinitions<Rel extends object> = {
  [K in keyof Rel]: RelationshipDefinition
}

type ResolveRelationshipValue<T extends RelationshipDefinition> =
  T extends RelationshipModel<any, infer Target, infer Kind>
    ? Kind extends 'oneToOne' | 'manyToOne'
      ? Target
      : Kind extends 'oneToMany' | 'manyToMany'
        ? Target[]
        : never
    : never

type ExtractAttributes<T extends object> = NonFunctionProperties<T>

type ResolvedRelationships<T extends AsRelationshipDefinitions<T>> = {
  [K in keyof T]: ResolveRelationshipValue<T[K]>
}

export type ModelAttributeField<T extends object> = keyof ExtractAttributes<T>

/** Keys of scalar attributes whose value is `number` (includes optional `number` via `NonNullable`). */
export type ModelAttributeFieldNumber<T extends object> = {
  [K in keyof ExtractAttributes<T>]: NonNullable<ExtractAttributes<T>[K]> extends number ? K : never
}[keyof ExtractAttributes<T>]

export type ModelAttributeValue<
  T extends object,
  K extends ModelAttributeField<T> = ModelAttributeField<T>
> = K extends keyof ExtractAttributes<T> ? ExtractAttributes<T>[K] : never

export type ModelAttributeFieldValues<T extends object> = {
  [K in ModelAttributeField<T>]: ModelAttributeValue<T, K>
}

/**
 * Relationship keys come from the `Rel` map (second generic on `QueryBuilder`), not from a `relationships` field on the model.
 */
export type ModelRelationshipField<
  _Model extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = keyof Rel & string

export type ExtractRelationshipFields<
  _Model extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = keyof Rel & string

export type ExtractRelationshipTargetModel<
  T extends object,
  K extends keyof Rel & string,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = Rel[K] extends RelationshipModel<T, infer Target, any> ? Target : never

export type ModelRelationshipValue<
  _Model extends object,
  K extends keyof Rel & string,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = Rel[K] extends RelationshipDefinition ? ResolveRelationshipValue<Rel[K]> : never

export type ResolvedModelRelationships<
  _Model extends object,
  Rel extends AsRelationshipDefinitions<Rel> = EmptyRelationshipMap
> = ResolvedRelationships<Rel>
