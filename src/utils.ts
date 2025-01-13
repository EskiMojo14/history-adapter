import type { Draft } from "immer";
import { current, isDraft, produce } from "immer";

export type NoInfer<T> = [T][T extends any ? 0 : never];

export type IfMaybeUndefined<T, True, False> = [undefined] extends [T]
  ? True
  : False;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type Compute<T> = { [K in keyof T]: T[K] } & unknown;

export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type Overwrite<T, U> = Compute<Omit<T, keyof U> & U>;

export type MaybeDraft<T> = T | Draft<T>;

const isDraftTyped = isDraft as <T>(value: MaybeDraft<T>) => value is Draft<T>;

export const ensureCurrent = <T>(value: T) =>
  isDraft(value) ? current(value) : value;

export function makeStateOperator<State, Args extends Array<any> = []>(
  mutator: (state: Draft<State>, ...args: Args) => void,
) {
  return function operator<S extends State | Draft<State>>(
    state: S,
    ...args: Args
  ): S {
    if (isDraftTyped(state)) {
      mutator(state as Draft<State>, ...args);
      return state;
    } else {
      return produce(state, (draft) => {
        mutator(draft as Draft<State>, ...args);
      });
    }
  };
}
