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

type HistoryEntryType<State> = State extends BaseHistoryState<any, infer T>
  ? T
  : never;

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

type ApplyEntry<StateFn extends BaseHistoryStateFn> = (
  state: StateFn["state"],
  historyEntry: HistoryEntryType<StateFn["state"]>,
) => HistoryEntryType<StateFn["state"]>;

type BuildHistoryAdapterConfig<StateFn extends BaseHistoryStateFn> = {
  applyEntry:
    | ApplyEntry<StateFn>
    | Record<"undo" | "redo", ApplyEntry<StateFn>>;
  wrapRecipe: <Data, Args extends Array<any>>(
    recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
    config: WrapRecipeConfig<Args>,
    adapterConfig?: GetConfigType<Data, StateFn>,
  ) => (
    state: Draft<GetStateType<Data, StateFn>>,
    ...args: Args
  ) => HistoryEntryType<GetStateType<Data, StateFn>>;
  onCreate?: (config?: GetConfigType<unknown, StateFn>) => void;
} & (BaseHistoryState<any, any> extends GetStateType<unknown, StateFn>
  ? {
      getInitialState?: GetInitialState<StateFn>;
    }
  : {
      getInitialState: GetInitialState<StateFn>;
    });

function buildCreateHistoryAdapter<StateFn extends BaseHistoryStateFn>({
  applyEntry,
  wrapRecipe,
  onCreate,
  getInitialState: getInitialStateCustom = getInitialState,
}: BuildHistoryAdapterConfig<StateFn>) {
  const { undo, redo } =
    typeof applyEntry === "function"
      ? { undo: applyEntry, redo: applyEntry }
      : applyEntry;
  function undoMutably(state: StateFn["state"]) {
    if (!state.past.length) return;
    state.future.unshift(undo(state, state.past.pop() as never));
  }
  function redoMutably(state: StateFn["state"]) {
    if (!state.future.length) return;
    state.past.push(redo(state, state.future.shift() as never));
  }
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

          const historyEntry = finalRecipe(state, ...args);

          // if paused, don't add to history
          if (state.paused) return;

          const undoable = config.isUndoable?.(...args) ?? true;
          if (undoable) {
            const lengthWithoutFuture = state.past.length + 1;
            if (
              adapterConfig?.limit &&
              lengthWithoutFuture > adapterConfig.limit
            ) {
              state.past.shift();
            }
            state.past.push(historyEntry);
            state.future = [];
          }
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
  applyEntry(state, historyEntry) {
    const stateBefore = state.present;
    state.present = historyEntry;
    return stateBefore;
  },
  wrapRecipe:
    <Data, Args extends Array<any>>(
      recipe: (
        draft: Draft<Data>,
        ...args: Args
      ) => ValidRecipeReturnType<Data>,
    ) =>
    (state: Draft<HistoryState<Data>>, ...args: Args) => {
      // we need to get the present state before the recipe is applied
      // and because the recipe might mutate it, we need the non-draft version
      const before = ensureCurrent(state.present) as Data;

      const result = recipe(state.present as Draft<Data>, ...args);
      if (result === nothing) {
        state.present = undefined as never;
      } else if (typeof result !== "undefined") {
        state.present = result as never;
      }

      return before;
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
    applyEntry: {
      undo(state, historyEntry) {
        applyPatches(state, historyEntry.undo);
        return historyEntry;
      },
      redo(state, historyEntry) {
        applyPatches(state, historyEntry.redo);
        return historyEntry;
      },
    },
    wrapRecipe:
      <Data, Args extends Array<any>>(
        recipe: (
          draft: Draft<Data>,
          ...args: Args
        ) => ValidRecipeReturnType<Data>,
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

        return { undo, redo };
      },
  });
