import type { Patch, Draft } from "immer";
import {
  nothing,
  enablePatches,
  applyPatches,
  produceWithPatches,
  produce,
  isDraft,
} from "immer";
import type { NoInfer } from "./utils";

type ValidRecipeReturnType<State> =
  | State
  | Draft<State>
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  | void
  | undefined
  | (State extends undefined ? typeof nothing : never);

export interface PatchState {
  undo: Array<Patch>;
  redo: Array<Patch>;
}

export interface HistoryState<Data> {
  past: Array<PatchState>;
  present: Data;
  future: Array<PatchState>;
}

enablePatches();

const isDraftTyped = isDraft as <T>(value: T | Draft<T>) => value is Draft<T>;

function makeStateOperator<State, Args extends Array<any> = []>(
  mutator: (state: Draft<State>, ...args: Args) => void,
) {
  return function operator<S extends State>(state: S, ...args: Args): S {
    if (isDraftTyped(state)) {
      mutator(state, ...args);
      return state;
    } else {
      return produce(state, (draft) => {
        mutator(draft, ...args);
      });
    }
  };
}

export interface HistoryAdapterConfig {
  limit?: number;
}

export interface UndoableConfig<Data, Args extends Array<any>, RootState> {
  /**
   * A function to extract from the arguments whether the action was undoable or not.
   * If not provided (or if function returns undefined), defaults to true.
   * Non-undoable actions will not be included in state history.
   */
  isUndoable?: (...args: Args) => boolean | undefined;
  /**
   * A function to select the history state from the root state.
   */
  selectHistoryState?: (state: Draft<RootState>) => HistoryState<Data>;
}

export interface HistoryAdapter<Data> {
  /**
   * Construct an initial state with no history.
   * @param initialData Data to include
   * @returns State shape including data
   */
  getInitialState(initialData: Data): HistoryState<Data>;
  /**
   * Applies previous patch if available, and returns state.
   * Will mutate directly if passed a draft, otherwise will return a new state immutably.
   * @param state History state shape, with patches
   */
  undo<State extends HistoryState<Data>>(state: State): State;
  /**
   * Applies next patch if available, and returns state.
   * Will mutate directly if passed a draft, otherwise will return a new state immutably.
   * @param state History state shape, with patches
   */
  redo<State extends HistoryState<Data>>(state: State): State;
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param n steps to move. Negative numbers move backwards.
   */
  jump<State extends HistoryState<Data>>(state: State, n: number): State;
  /**
   * Clears past and present history.
   * @param state History state shape, with patches
   */
  clearHistory<State extends HistoryState<Data>>(state: State): State;

  /**
   * Wraps a function to automatically update patch history according to changes
   * @param recipe An immer-style recipe, which can mutate the draft or return new state
   * @param config Configuration for undoable action
   */
  undoable<Args extends Array<any>, RootState = HistoryState<Data>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config?: UndoableConfig<Data, Args, RootState>,
  ): <State extends RootState>(state: State, ...args: Args) => State;
  /**
   * Wraps a function to automatically update patch history according to changes
   * @param recipe An immer-style recipe, which can mutate the draft or return new state
   * @param isUndoable A function to extract from the arguments whether the action was undoable or not. If not provided (or if function returns undefined), defaults to true.
   * Non-undoable actions will not be included in state history.
   */
  undoable<Args extends Array<any>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    isUndoable?: (...args: NoInfer<Args>) => boolean | undefined,
  ): <State extends HistoryState<Data>>(state: State, ...args: Args) => State;
}

/**
 * Construct an initial state with no history.
 * @param initialData Data to include
 * @returns State shape including data
 */
export function getInitialState<Data>(initialData: Data): HistoryState<Data> {
  return {
    past: [],
    present: initialData,
    future: [],
  };
}

export function createHistoryAdapter<Data>({
  limit,
}: HistoryAdapterConfig = {}): HistoryAdapter<Data> {
  function undoMutably(state: Draft<HistoryState<unknown>>) {
    const historyEntry = state.past.pop();
    if (historyEntry) {
      applyPatches(state, historyEntry.undo);
      state.future.unshift(historyEntry);
    }
  }
  function redoMutably(state: Draft<HistoryState<unknown>>) {
    const historyEntry = state.future.shift();
    if (historyEntry) {
      applyPatches(state, historyEntry.redo);
      state.past.push(historyEntry);
    }
  }

  return {
    getInitialState,
    undo: makeStateOperator(undoMutably),
    redo: makeStateOperator(redoMutably),
    jump: makeStateOperator<HistoryState<Data>, [number]>((state, n) => {
      if (n < 0) {
        for (let i = 0; i < -n; i++) {
          undoMutably(state);
        }
      } else {
        for (let i = 0; i < n; i++) {
          redoMutably(state);
        }
      }
    }),
    clearHistory: makeStateOperator<HistoryState<Data>>((state) => {
      state.past = [];
      state.future = [];
    }),
    undoable<Args extends Array<any>, RootState>(
      recipe: (
        draft: Draft<Data>,
        ...args: Args
      ) => ValidRecipeReturnType<Data>,
      configOrIsUndoable?:
        | UndoableConfig<Data, Args, RootState>
        | ((...args: Args) => boolean | undefined),
    ) {
      const {
        isUndoable,
        selectHistoryState = (s) => s as HistoryState<Data>,
      }: UndoableConfig<Data, Args, RootState> =
        typeof configOrIsUndoable === "function"
          ? { isUndoable: configOrIsUndoable }
          : configOrIsUndoable ?? {};
      return makeStateOperator<RootState, Args>((rootState, ...args) => {
        const state = selectHistoryState(rootState);
        const [{ present }, redo, undo] = produceWithPatches(state, (draft) => {
          const result = recipe(draft.present as Draft<Data>, ...args);
          if (result === nothing) {
            draft.present = undefined as Draft<Data>;
          } else if (typeof result !== "undefined") {
            draft.present = result as Draft<Data>;
          }
        });
        state.present = present;

        const undoable = isUndoable?.(...args) ?? true;
        if (undoable) {
          const lengthWithoutFuture = state.past.length + 1;
          if (limit && lengthWithoutFuture > limit) {
            state.past.shift();
          }
          state.past.push({ undo, redo });
          state.future = [];
        }
      });
    },
  };
}
