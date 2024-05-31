import type { Patch, Draft } from "immer";
import {
  nothing,
  enablePatches,
  applyPatches,
  produceWithPatches,
} from "immer";
import { ensureCurrent, makeStateOperator } from "./utils";
import type { MaybeDraft } from "./utils";

type ValidRecipeReturnType<State> =
  | State
  | Draft<State>
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  | void
  | undefined
  | (State extends undefined ? typeof nothing : never);

export type ImmerRecipe<Data, Args extends Array<any>> = (
  draft: Draft<Data>,
  ...args: Args
) => ValidRecipeReturnType<Data>;

export type DataFromRecipe<Recipe extends ImmerRecipe<any, any>> =
  Recipe extends ImmerRecipe<infer T, any> ? T : never;

export interface BaseHistoryState<Data, HistoryEntry> {
  past: Array<HistoryEntry>;
  present: Data;
  future: Array<HistoryEntry>;
  paused: boolean;
}

type HistoryEntryType<State> = State extends BaseHistoryState<any, infer T>
  ? T
  : never;

export interface BaseHistoryAdapterConfig {
  /**
   * Maximum number of past states to keep.
   * If limit is reached, the oldest state will be removed.
   * If not provided, all states will be kept.
   */
  limit?: number;
}

export interface BaseHistoryStateFn {
  dataConstraint: unknown;
  _rawData: unknown;
  data: this["_rawData"] extends this["dataConstraint"]
    ? this["_rawData"]
    : never;
  state: BaseHistoryState<this["data"], unknown>;
  config: BaseHistoryAdapterConfig;
}

export type GetStateType<
  Data,
  StateFn extends BaseHistoryStateFn,
> = (StateFn & {
  _rawData: Data;
})["state"];

export type GetConfigType<
  Data,
  StateFn extends BaseHistoryStateFn,
> = (StateFn & {
  _rawData: Data;
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
    recipe: ImmerRecipe<Data, Args>,
    config?: UndoableConfig<Data, Args, RootState, State>,
  ): <State extends MaybeDraft<RootState>>(
    state: State,
    ...args: Args
  ) => State;
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

type GetInitialState<StateFn extends BaseHistoryStateFn> = <
  Data extends StateFn["dataConstraint"],
>(
  initialData: Data,
) => GetStateType<Data, StateFn>;

type ApplyOp = "undo" | "redo";

export type BuildHistoryAdapterConfig<StateFn extends BaseHistoryStateFn> = {
  /**
   * Function to apply a history entry to the state.
   * Should return a history entry to be added to the opposite stack (i.e. past or future).
   *
   * For example, when undoing, the entry is removed from the past stack, provided to `applyEntry`, and the result is added to the future stack.
   */
  applyEntry: <Data extends StateFn["dataConstraint"]>(
    state: GetStateType<Data, StateFn>,
    historyEntry: HistoryEntryType<GetStateType<Data, StateFn>>,
    op: ApplyOp,
  ) => HistoryEntryType<GetStateType<Data, StateFn>>;
  /**
   * Function to wrap a recipe to automatically update patch history according to changes.
   * Should return a function that receives the state and arguments, and returns a history entry to be added to the past stack.
   */
  wrapRecipe: <Data extends StateFn["dataConstraint"], Args extends Array<any>>(
    recipe: ImmerRecipe<Data, Args>,
  ) => (
    state: Draft<GetStateType<Data, StateFn>>,
    ...args: Args
  ) => HistoryEntryType<GetStateType<Data, StateFn>>;
  /**
   * A function to run when the adapter is created.
   *
   * Useful for setup such as enabling patches.
   */
  onCreate?: (
    config?: GetConfigType<StateFn["dataConstraint"], StateFn>,
  ) => void;
} & (BaseHistoryState<any, any> extends GetStateType<
  StateFn["dataConstraint"],
  StateFn
>
  ? {
      /**
       * Function to construct an initial state with no history.
       */
      getInitialState?: GetInitialState<StateFn>;
    }
  : {
      /**
       * Function to construct an initial state with no history.
       */
      getInitialState: GetInitialState<StateFn>;
    });

export type CreateHistoryAdapter<StateFn extends BaseHistoryStateFn> = <
  Data extends StateFn["dataConstraint"],
>(
  adapterConfig?: GetConfigType<Data, StateFn>,
) => HistoryAdapter<Data, GetStateType<Data, StateFn>>;

export function buildCreateHistoryAdapter<StateFn extends BaseHistoryStateFn>({
  applyEntry,
  wrapRecipe,
  onCreate,
  getInitialState: getInitialStateCustom = getInitialState,
}: BuildHistoryAdapterConfig<StateFn>): CreateHistoryAdapter<StateFn> {
  function undoMutably(state: StateFn["state"]) {
    if (!state.past.length) return;
    state.future.unshift(applyEntry(state, state.past.pop() as never, "undo"));
  }
  function redoMutably(state: StateFn["state"]) {
    if (!state.future.length) return;
    state.past.push(applyEntry(state, state.future.shift() as never, "redo"));
  }
  return function createHistoryAdapter<Data extends StateFn["dataConstraint"]>(
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
        config?: UndoableConfig<Data, Args, RootState, State>,
      ) => {
        const { selectHistoryState, isUndoable } = config ?? {};
        const finalRecipe = wrapRecipe(recipe);
        return makeStateOperator<RootState, Args>((rootState, ...args) => {
          const state =
            selectHistoryState?.(rootState as never) ??
            (rootState as Draft<GetStateType<Data, StateFn>>);

          const historyEntry = finalRecipe(state, ...args);

          // if paused, don't add to history
          if (state.paused) return;

          const undoable = isUndoable?.(...args) ?? true;
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

export interface HistoryStateFn extends BaseHistoryStateFn {
  state: HistoryState<this["data"]>;
}

/**
 * Calls a recipe with the present state and arguments, and applies the result to the state.
 *
 * Correctly handles immer's `nothing` and `undefined` return values.
 */
export const applyRecipe = <
  Data,
  Args extends Array<any>,
  State extends MaybeDraft<BaseHistoryState<Data, unknown>>,
>(
  state: State,
  recipe: (draft: Draft<Data>, ...args: Args) => ValidRecipeReturnType<Data>,
  ...args: Args
) => {
  const result = recipe(state.present as Draft<Data>, ...args);
  if (result === nothing) {
    state.present = undefined as never;
  } else if (typeof result !== "undefined") {
    state.present = result as never;
  }
};

export const createHistoryAdapter =
  /* @__PURE__ */ buildCreateHistoryAdapter<HistoryStateFn>({
    applyEntry(state, historyEntry) {
      const stateBefore = state.present;
      state.present = historyEntry;
      return stateBefore;
    },
    wrapRecipe:
      (recipe) =>
      (state, ...args) => {
        // we need to get the present state before the recipe is applied
        // and because the recipe might mutate it, we need the non-draft version
        const before = ensureCurrent(state.present) as DataFromRecipe<
          typeof recipe
        >;

        applyRecipe(state, recipe, ...args);

        return before;
      },
  });

export type PatchState = Record<ApplyOp, Array<Patch>>;

export type PatchHistoryState<Data> = BaseHistoryState<Data, PatchState>;

export interface PatchHistoryStateFn extends BaseHistoryStateFn {
  state: PatchHistoryState<this["data"]>;
}

export const createPatchHistoryAdapter =
  /* @__PURE__ */ buildCreateHistoryAdapter<PatchHistoryStateFn>({
    onCreate() {
      enablePatches();
    },
    applyEntry(state, historyEntry, op) {
      applyPatches(state, historyEntry[op]);
      return historyEntry;
    },
    wrapRecipe:
      (recipe) =>
      (state, ...args) => {
        const [{ present }, redo, undo] = produceWithPatches(state, (draft) => {
          applyRecipe(draft as never, recipe, ...args);
        });
        state.present = present;

        return { undo, redo };
      },
  });
