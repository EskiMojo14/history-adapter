import type { Patch, Draft } from "immer";
import {
  nothing,
  enablePatches,
  applyPatches,
  produceWithPatches,
} from "immer";
import { ensureCurrent, makeStateOperator } from "./utils";
import type { MaybeDraft, NoInfer } from "./utils";

type ValidRecipeReturnType<State> =
  | State
  | Draft<State>
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  | void
  | undefined
  | (State extends undefined ? typeof nothing : never);

export interface BaseHistoryState<Data, HistoryEntry> {
  past: Array<HistoryEntry>;
  present: Data;
  future: Array<HistoryEntry>;
  paused: boolean;
}

export interface HistoryAdapterConfig {
  /**
   * Maximum number of past states to keep.
   * If limit is reached, the oldest state will be removed.
   * If not provided, all states will be kept.
   */
  limit?: number;
}

interface BaseHistoryStateFn {
  state: BaseHistoryState<this["data"], unknown>;
  data: unknown;
  config: HistoryAdapterConfig;
}

type GetStateType<Data, StateFn extends BaseHistoryStateFn> = (StateFn & {
  data: Data;
})["state"];

type GetConfigType<Data, StateFn extends BaseHistoryStateFn> = (StateFn & {
  data: Data;
})["config"];

export interface WrapRecipeConfig<Args extends Array<any>> {
  /**
   * A function to extract from the arguments whether the action was undoable or not.
   * If not provided (or if function returns undefined), defaults to true.
   * Non-undoable actions will not be included in state history.
   */
  isUndoable?: (...args: Args) => boolean | undefined;
}

export interface UndoableConfig<
  Data,
  Args extends Array<any>,
  RootState,
  State extends BaseHistoryState<unknown, unknown> = HistoryState<Data>,
> extends WrapRecipeConfig<Args> {
  /**
   * A function to select the history state from the root state.
   */
  selectHistoryState?: (state: Draft<RootState>) => Draft<State>;
}

export interface HistoryAdapter<
  Data,
  State extends BaseHistoryState<unknown, unknown> = HistoryState<Data>,
> {
  /**
   * Construct an initial state with no history.
   * @param initialData Data to include
   * @returns State shape including data
   */
  getInitialState(initialData: Data): State;
  /**
   * Applies previous patch if available, and returns state.
   * Will mutate directly if passed a draft, otherwise will return a new state immutably.
   * @param state History state shape, with patches
   */
  undo<S extends MaybeDraft<State>>(state: S): S;
  /**
   * Applies next patch if available, and returns state.
   * Will mutate directly if passed a draft, otherwise will return a new state immutably.
   * @param state History state shape, with patches
   */
  redo<S extends MaybeDraft<State>>(state: S): S;
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param n steps to move. Negative numbers move backwards.
   */
  jump<S extends MaybeDraft<State>>(state: S, n: number): S;
  /**
   * Clears past and present history.
   * @param state History state shape, with patches
   */
  clearHistory<S extends MaybeDraft<State>>(state: S): S;

  /**
   * Wraps a function to automatically update patch history according to changes
   * @param recipe An immer-style recipe, which can mutate the draft or return new state
   * @param config Configuration for undoable action
   */
  undoable<Args extends Array<any>, RootState = State>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config?: UndoableConfig<Data, Args, RootState, State>,
  ): <State extends MaybeDraft<RootState>>(
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
  ): <S extends MaybeDraft<State>>(state: S, ...args: Args) => S;

  /**
   * Pauses the history, preventing any new patches from being added.
   * @param state History state shape, with patches
   */
  pause<S extends MaybeDraft<State>>(state: S): S;
  /**
   * Resumes the history, allowing new patches to be added.
   * @param state History state shape, with patches
   */
  resume<S extends MaybeDraft<State>>(state: S): S;
}

/**
 * Construct an initial state with no history.
 * @param initialData Data to include
 * @returns State shape including data
 */
export function getInitialState<Data, HistoryEntry>(
  initialData: Data,
): BaseHistoryState<Data, HistoryEntry> {
  return {
    past: [],
    present: initialData,
    future: [],
    paused: false,
  };
}

type GetInitialState<StateFn extends BaseHistoryStateFn> = <Data>(
  initialData: Data,
) => GetStateType<Data, StateFn>;

type BuildHistoryAdapterConfig<StateFn extends BaseHistoryStateFn> = {
  undoMutably: (state: StateFn["state"]) => void;
  redoMutably: (state: StateFn["state"]) => void;
  wrapRecipe: <Data, Args extends Array<any>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config: WrapRecipeConfig<Args>,
    adapterConfig?: GetConfigType<Data, StateFn>,
  ) => (state: Draft<GetStateType<Data, StateFn>>, ...args: Args) => void;
  onCreate?: (config?: GetConfigType<unknown, StateFn>) => void;
} & (BaseHistoryState<any, any> extends GetStateType<unknown, StateFn>
  ? {
      getInitialState?: GetInitialState<StateFn>;
    }
  : {
      getInitialState: GetInitialState<StateFn>;
    });

function buildCreateHistoryAdapter<StateFn extends BaseHistoryStateFn>({
  undoMutably,
  redoMutably,
  wrapRecipe,
  onCreate,
  getInitialState: getInitialStateCustom = getInitialState,
}: BuildHistoryAdapterConfig<StateFn>) {
  return function createHistoryAdapter<Data>(
    adapterConfig?: GetConfigType<Data, StateFn>,
  ): HistoryAdapter<Data, GetStateType<Data, StateFn>> {
    type State = GetStateType<Data, StateFn>;
    onCreate?.(adapterConfig);
    return {
      getInitialState: getInitialStateCustom,
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
          | UndoableConfig<Data, Args, RootState, State>
          | ((...args: Args) => boolean | undefined),
      ) => {
        const {
          selectHistoryState,
          ...config
        }: UndoableConfig<Data, Args, RootState, State> =
          typeof configOrIsUndoable === "function"
            ? { isUndoable: configOrIsUndoable }
            : configOrIsUndoable ?? {};
        const finalRecipe = wrapRecipe(recipe, config, adapterConfig);
        return makeStateOperator<RootState, Args>((rootState, ...args) => {
          const state =
            selectHistoryState?.(rootState as never) ??
            (rootState as Draft<GetStateType<Data, StateFn>>);
          finalRecipe(state, ...args);
        });
      },
    };
  };
}

export type HistoryState<Data> = BaseHistoryState<Data, Data>;

interface HistoryStateFn extends BaseHistoryStateFn {
  state: HistoryState<this["data"]>;
}

export const createHistoryAdapter = buildCreateHistoryAdapter<HistoryStateFn>({
  undoMutably(state) {
    if (!state.past.length) return;
    const historyEntry = state.past.pop();
    state.future.unshift(state.present);
    state.present = historyEntry;
  },
  redoMutably(state) {
    if (!state.future.length) return;
    const historyEntry = state.future.shift();
    state.past.push(state.present);
    state.present = historyEntry;
  },
  wrapRecipe:
    <Data, Args extends Array<any>>(
      recipe: (
        draft: Draft<Data>,
        ...args: Args
      ) => ValidRecipeReturnType<Data>,
      config: WrapRecipeConfig<Args>,
      adapterConfig: HistoryAdapterConfig = {},
    ) =>
    (state: Draft<HistoryState<Data>>, ...args: Args) => {
      // we need to get the present state before the recipe is applied
      // and because the recipe might mutate it, we need the non-draft version
      const before = ensureCurrent(state.present);
      const result = recipe(state.present as Draft<Data>, ...args);
      if (result === nothing) {
        state.present = undefined as never;
      } else if (typeof result !== "undefined") {
        state.present = result as never;
      }

      // if paused, don't add to history
      if (state.paused) return;

      const undoable = config.isUndoable?.(...args) ?? true;
      if (undoable) {
        const lengthWithoutFuture = state.past.length + 1;
        if (adapterConfig.limit && lengthWithoutFuture > adapterConfig.limit) {
          state.past.shift();
        }
        state.past.push(before);
        state.future = [];
      }
    },
});

export interface PatchState {
  undo: Array<Patch>;
  redo: Array<Patch>;
}

export type PatchHistoryState<Data> = BaseHistoryState<Data, PatchState>;

interface PatchHistoryStateFn extends BaseHistoryStateFn {
  state: PatchHistoryState<this["data"]>;
}

export const createPatchHistoryAdapter =
  buildCreateHistoryAdapter<PatchHistoryStateFn>({
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
      <Data, Args extends Array<any>>(
        recipe: (
          draft: Draft<Data>,
          ...args: Args
        ) => ValidRecipeReturnType<Data>,
        config: WrapRecipeConfig<Args>,
        adapterConfig: HistoryAdapterConfig = {},
      ) =>
      (state: Draft<PatchHistoryState<Data>>, ...args: Args) => {
        const [{ present }, redo, undo] = produceWithPatches(state, (draft) => {
          const result = recipe(draft.present as Draft<Data>, ...args);
          if (result === nothing) {
            draft.present = undefined as never;
          } else if (typeof result !== "undefined") {
            draft.present = result as never;
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
