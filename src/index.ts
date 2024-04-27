import type { Patch, Draft } from "immer";
import {
  nothing,
  enablePatches,
  applyPatches,
  produceWithPatches,
  produce,
  isDraft,
} from "immer";
import type { NoInfer, Overwrite } from "./utils";

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
  paused: boolean;
}

export type MaybeDraftHistoryState<Data> =
  | HistoryState<Data>
  | Draft<HistoryState<Data>>;

export type NonPatchHistoryState<Data> = Overwrite<
  HistoryState<Data>,
  {
    past: Array<Data>;
    future: Array<Data>;
  }
>;

export type MaybeDraftNonPatchHistoryState<Data> =
  | NonPatchHistoryState<Data>
  | Draft<NonPatchHistoryState<Data>>;

interface HistoryStateType {
  state: {
    past: Array<unknown>;
    present: unknown;
    future: Array<unknown>;
    paused: boolean;
  };
  data: unknown;
}

interface PatchHistoryStateType extends HistoryStateType {
  state: MaybeDraftHistoryState<this["data"]>;
}

interface NonPatchHistoryStateType extends HistoryStateType {
  state: MaybeDraftNonPatchHistoryState<this["data"]>;
}

type ApplyDataType<Data, StateType extends HistoryStateType> = (StateType & {
  data: Data;
})["state"];

const isDraftTyped = isDraft as <T>(value: T | Draft<T>) => value is Draft<T>;

function makeStateOperator<State, Args extends Array<any> = []>(
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

export interface HistoryAdapterConfig {
  limit?: number;
}

export interface UndoableConfig<
  HistoryStateType,
  Args extends Array<any>,
  RootState,
> {
  /**
   * A function to extract from the arguments whether the action was undoable or not.
   * If not provided (or if function returns undefined), defaults to true.
   * Non-undoable actions will not be included in state history.
   */
  isUndoable?: (...args: Args) => boolean | undefined;
  /**
   * A function to select the history state from the root state.
   */
  selectHistoryState?: (state: Draft<RootState>) => Draft<HistoryStateType>;
}

export interface HistoryAdapter<Data, HistoryStateType> {
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
  undo<State extends HistoryStateType>(state: State): State;
  /**
   * Applies next patch if available, and returns state.
   * Will mutate directly if passed a draft, otherwise will return a new state immutably.
   * @param state History state shape, with patches
   */
  redo<State extends HistoryStateType>(state: State): State;
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param n steps to move. Negative numbers move backwards.
   */
  jump<State extends HistoryStateType>(state: State, n: number): State;
  /**
   * Clears past and present history.
   * @param state History state shape, with patches
   */
  clearHistory<State extends HistoryStateType>(state: State): State;

  /**
   * Wraps a function to automatically update patch history according to changes
   * @param recipe An immer-style recipe, which can mutate the draft or return new state
   * @param config Configuration for undoable action
   */
  undoable<Args extends Array<any>, RootState = HistoryStateType>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config?: UndoableConfig<HistoryStateType, Args, RootState>,
  ): <State extends RootState | Draft<RootState>>(
    state: State,
    ...args: Args
  ) => State;
  /**
   * Wraps a function to automatically update patch history according to changes
   * @param recipe An immer-style recipe, which can mutate the draft or return new state
   * @param isUndoable A function to extract from the arguments whether the action was undoable or not. If not provided (or if function returns undefined), defaults to true.
   * Non-undoable actions will not be included in state history.
   */
  undoable<Args extends Array<any>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    isUndoable?: (...args: NoInfer<Args>) => boolean | undefined,
  ): <State extends MaybeDraftHistoryState<Data>>(
    state: State,
    ...args: Args
  ) => State;

  /**
   * Pauses the history, preventing any new patches from being added.
   * @param state History state shape, with patches
   */
  pause<State extends MaybeDraftHistoryState<Data>>(state: State): State;
  /**
   * Resumes the history, allowing new patches to be added.
   * @param state History state shape, with patches
   */
  resume<State extends MaybeDraftHistoryState<Data>>(state: State): State;
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
    paused: false,
  };
}

interface BuildHistoryAdapterConfig<StateType extends HistoryStateType> {
  undoMutably: (state: StateType["state"]) => void;
  redoMutably: (state: StateType["state"]) => void;
  wrapRecipe: <Data, Args extends Array<any>, RootState>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config: UndoableConfig<ApplyDataType<Data, StateType>, Args, RootState>,
    adapterConfig: HistoryAdapterConfig,
  ) => (state: Draft<RootState>, ...args: Args) => void;
  onCreate?: (config: HistoryAdapterConfig) => void;
}

function buildCreateHistoryAdapter<StateType extends HistoryStateType>({
  undoMutably,
  redoMutably,
  wrapRecipe,
  onCreate,
}: BuildHistoryAdapterConfig<StateType>) {
  return function createHistoryAdapter<Data>(
    adapterConfig: HistoryAdapterConfig = {},
  ): HistoryAdapter<Data, ApplyDataType<Data, StateType>> {
    type State = ApplyDataType<Data, StateType>;
    onCreate?.(adapterConfig);
    return {
      getInitialState,
      undo: makeStateOperator(undoMutably),
      redo: makeStateOperator(redoMutably),
      jump: makeStateOperator<State, [number]>((state, n) => {
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
      clearHistory: makeStateOperator<State>((state) => {
        state.past = [];
        state.future = [];
      }),
      pause: makeStateOperator<State>((state) => {
        state.paused = true;
      }),
      resume: makeStateOperator<State>((state) => {
        state.paused = false;
      }),
      undoable: <Args extends Array<any>, RootState>(
        recipe: (
          draft: Draft<Data>,
          ...args: Args
        ) => ValidRecipeReturnType<Data>,
        configOrIsUndoable?:
          | UndoableConfig<State, Args, RootState>
          | ((...args: Args) => boolean | undefined),
      ) => {
        const config: UndoableConfig<State, Args, RootState> =
          typeof configOrIsUndoable === "function"
            ? { isUndoable: configOrIsUndoable }
            : configOrIsUndoable ?? {};
        return makeStateOperator(
          wrapRecipe<Data, Args, RootState>(recipe, config, adapterConfig),
        );
      },
    };
  };
}

export const createHistoryAdapter =
  buildCreateHistoryAdapter<PatchHistoryStateType>({
    onCreate() {
      enablePatches();
    },
    undoMutably(state) {
      const historyEntry = state.past.pop();
      if (historyEntry) {
        applyPatches(state, historyEntry.undo);
        state.future.unshift(historyEntry);
      }
    },
    redoMutably(state) {
      const historyEntry = state.future.shift();
      if (historyEntry) {
        applyPatches(state, historyEntry.redo);
        state.past.push(historyEntry);
      }
    },
    wrapRecipe:
      <Data, Args extends Array<any>, RootState>(
        recipe: (
          draft: Draft<Data>,
          ...args: Args
        ) => ValidRecipeReturnType<Data>,
        config: UndoableConfig<
          ApplyDataType<Data, HistoryStateType>,
          Args,
          RootState
        >,
        adapterConfig: HistoryAdapterConfig,
      ) =>
      (rootState: Draft<RootState>, ...args: Args) => {
        const state =
          config.selectHistoryState?.(rootState) ??
          (rootState as ApplyDataType<Data, HistoryStateType>);
        const [{ present }, redo, undo] = produceWithPatches(state, (draft) => {
          const result = recipe(draft.present as Draft<Data>, ...args);
          if (result === nothing) {
            draft.present = undefined as Draft<Data>;
          } else if (typeof result !== "undefined") {
            draft.present = result as Draft<Data>;
          }
        });
        state.present = present;

        // if paused, don't add to history
        if (state.paused) return;

        const undoable = config.isUndoable?.(...args) ?? true;
        if (undoable) {
          const lengthWithoutFuture = state.past.length + 1;
          if (
            adapterConfig.limit &&
            lengthWithoutFuture > adapterConfig.limit
          ) {
            state.past.shift();
          }
          state.past.push({ undo, redo });
          state.future = [];
        }
      },
  });

export const createNoPatchHistoryAdapter =
  buildCreateHistoryAdapter<NonPatchHistoryStateType>({
    undoMutably(state) {
      if (!state.past.length) return;
      const historyEntry = state.past.pop();
      state.present = historyEntry;
      state.future.unshift(historyEntry);
    },
    redoMutably(state) {
      if (!state.future.length) return;
      const historyEntry = state.future.shift();
      state.present = historyEntry;
      state.past.push(historyEntry);
    },
    wrapRecipe: <Data, Args extends Array<any>, RootState>(
      recipe: (
        draft: Draft<Data>,
        ...args: Args
      ) => ValidRecipeReturnType<Data>,
      config: UndoableConfig<
        ApplyDataType<Data, NonPatchHistoryStateType>,
        Args,
        RootState
      >,
      adapterConfig: HistoryAdapterConfig,
    ) => {
      return (rootState: Draft<RootState>, ...args: Args) => {
        const state =
          (config.selectHistoryState?.(rootState) as
            | Draft<NonPatchHistoryState<Data>>
            | undefined) ?? (rootState as never);
        const result = recipe(state.present as Draft<Data>, ...args);
        if (result === nothing) {
          state.present = undefined as Draft<Data>;
        } else if (typeof result !== "undefined") {
          state.present = result as Draft<Data>;
        }

        // if paused, don't add to history
        if (state.paused) return;

        const undoable = config.isUndoable?.(...args) ?? true;
        if (undoable) {
          const lengthWithoutFuture = state.past.length + 1;
          if (
            adapterConfig.limit &&
            lengthWithoutFuture > adapterConfig.limit
          ) {
            state.past.shift();
          }
          state.past.push(state.present);
          state.future = [];
        }
      };
    },
  });
