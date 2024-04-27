export type NoInfer<T> = [T][T extends any ? 0 : never];

export type IfMaybeUndefined<T, True, False> = [undefined] extends [T]
  ? True
  : False;

export type Compute<T> = { [K in keyof T]: T[K] } & unknown;

export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type Overwrite<T, U> = Compute<Omit<T, keyof U> & U>;
