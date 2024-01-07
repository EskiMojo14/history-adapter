export type NoInfer<T> = [T][T extends any ? 0 : never];

export type IfMaybeUndefined<T, True, False> = [undefined] extends [T]
  ? True
  : False;

export type Compute<T> = { [K in keyof T]: T[K] } & unknown;
