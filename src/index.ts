import {
  type Patch,
  type Draft,
  nothing,
  enablePatches,
  applyPatches,
  produceWithPatches,
  produce,
  isDraft,
} from "immer";

type NoInfer<T> = [T][T extends any ? 0 : never];

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
  getInitialState(initialData: Data): HistoryState<Data>;
  undo<State extends HistoryState<Data>>(state: State): State;
  redo<State extends HistoryState<Data>>(state: State): State;
  undoable<Args extends Array<any>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    isUndoable?: (...args: NoInfer<Args>) => boolean | undefined,
  ): <State extends HistoryState<Data>>(state: State, ...args: Args) => State;
}

export function createHistoryAdapter<Data>(): HistoryAdapter<Data> {
  return {
    getInitialState(initialData) {
      return {
        past: [],
        present: initialData,
        future: [],
      };
    },
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
        const undoable = isUndoable ? isUndoable(...args) ?? true : true;
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
