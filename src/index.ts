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

function makeStateOperator<Data>(mutator: (state: HistoryState<Data>) => void) {
  return function operator(state: HistoryState<Data>) {
    if (isDraft(state)) {
      mutator(state);
      return state;
    } else {
      return produce(state, mutator);
    }
  };
}

export function createHistoryAdapter<Data>() {
  return {
    getInitialState(initialData: Data): HistoryState<Data> {
      return {
        past: [],
        present: initialData,
        future: [],
      };
    },
    undo: makeStateOperator<Data>((state) => {
      const historyEntry = state.past.pop();
      if (historyEntry) {
        applyPatches(state, historyEntry.undo);
        state.future.unshift(historyEntry);
      }
      return state;
    }),
    redo: makeStateOperator<Data>((state) => {
      const historyEntry = state.future.shift();
      if (historyEntry) {
        applyPatches(state, historyEntry.redo);
        state.past.push(historyEntry);
      }
      return state;
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    undoable<Args extends Array<any>>(
      recipe: (
        draft: Draft<Data>,
        ...args: Args
      ) => ValidRecipeReturnType<Data>,
      isUndoable?: (...args: NoInfer<Args>) => boolean | undefined,
    ) {
      return function wrapper(state: HistoryState<Data>, ...args: Args) {
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
