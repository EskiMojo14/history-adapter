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

function makeStateOperator<Data, State extends HistoryState<Data>>(
  mutator: (state: State) => void,
) {
  return function operator(state: State) {
    if (isDraft(state)) {
      mutator(state);
      return state;
    } else {
      return produce(state, mutator);
    }
  };
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

export function createHistoryAdapter<Data>(): HistoryAdapter<Data> {
  return {
    getInitialState,
    undo: makeStateOperator((state) => {
      const historyEntry = state.past.pop();
      if (historyEntry) {
        applyPatches(state, historyEntry.undo);
        state.future.unshift(historyEntry);
      }
      return state;
    }),
    redo: makeStateOperator((state) => {
      const historyEntry = state.future.shift();
      if (historyEntry) {
        applyPatches(state, historyEntry.redo);
        state.past.push(historyEntry);
      }
      return state;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    undoable(recipe, isUndoable) {
      return function wrapper(state, ...args) {
        const [nextState, redoPatch, undoPatch] = produceWithPatches(
          state,
          (draft) => {
            const result = recipe(draft.present, ...args);
            if (result === nothing) {
              draft.present = undefined as Draft<Data>;
            } else if (typeof result !== "undefined") {
              draft.present = result as Draft<Data>;
            }
          },
        );
        let finalState = nextState;
        const undoable = isUndoable?.(...args) ?? true;
        if (undoable) {
          finalState = produce(finalState, (draft) => {
            draft.past.push({
              undo: undoPatch,
              redo: redoPatch,
            });
            draft.future = [];
          });
        }
        return finalState;
      };
    },
  };
}
