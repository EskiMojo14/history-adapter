import type { Action, CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import {
  isFluxStandardAction,
  createDraftSafeSelector,
} from "@reduxjs/toolkit";
import type {
  HistoryAdapter as Adapter,
  BaseHistoryState,
  HistoryState,
  UndoableConfig,
  HistoryAdapterConfig,
  MaybeDraft,
  NonPatchHistoryState,
} from ".";
import {
  createHistoryAdapter as createAdapter,
  createNoPatchHistoryAdapter as createNoPatchAdapter,
} from ".";
import type { IfMaybeUndefined } from "./utils";
import type { CreateSelectorFunction, Selector } from "reselect";

export type { HistoryState, HistoryAdapterConfig } from ".";
export { getInitialState } from ".";

type AnyFunction = (...args: any) => any;
type AnyCreateSelectorFunction = CreateSelectorFunction<
  <F extends AnyFunction>(f: F) => F,
  <F extends AnyFunction>(f: F) => F
>;

export interface GetSelectorsOptions {
  createSelector?: AnyCreateSelectorFunction;
}

export interface HistorySelectors<Data, State = HistoryState<Data>> {
  /**
   * Returns true if there are any patches in the past
   * @param state History state shape, with patches
   */
  selectCanUndo: (state: State) => boolean;
  /**
   * Returns true if there are any patches in the future
   * @param state History state shape, with patches
   */
  selectCanRedo: (state: State) => boolean;
  /**
   * A selector which automatically extracts the present state
   */
  selectPresent: (state: State) => Data;

  /**
   * Returns true if the history is paused
   */
  selectPaused: (state: State) => boolean;
}

function globaliseSelectors<
  Data,
  RootState,
  State extends BaseHistoryState<Data, unknown>,
  Selected extends Record<string, unknown>,
>(
  createSelector: AnyCreateSelectorFunction,
  selectState: (rootState: RootState) => State,
  selectors: {
    [K in keyof Selected]: (state: State) => Selected[K];
  },
): {
  [K in keyof Selected]: (rootState: RootState) => Selected[K];
} {
  const result: Record<string, Selector<RootState>> = {};
  for (const key of Object.keys(selectors)) {
    result[key] = createSelector(selectState, selectors[key as keyof Selected]);
  }
  return result as never;
}

function makeSelectorFactory<
  Data,
  State extends BaseHistoryState<Data, unknown>,
>() {
  function getSelectors(): HistorySelectors<Data, State>;
  function getSelectors<RootState>(
    selectState: (rootState: RootState) => State,
    options?: GetSelectorsOptions,
  ): HistorySelectors<Data, RootState>;
  function getSelectors<RootState>(
    selectState?: (rootState: RootState) => State,
    { createSelector = createDraftSafeSelector }: GetSelectorsOptions = {},
  ): HistorySelectors<Data, any> {
    const localisedSelectors = {
      selectCanUndo: (state) => state.past.length > 0,
      selectCanRedo: (state) => state.future.length > 0,
      selectPresent: (state) => state.present,
      selectPaused: (state) => state.paused,
    } satisfies HistorySelectors<Data, State>;
    if (!selectState) {
      return localisedSelectors;
    }
    return globaliseSelectors(createSelector, selectState, localisedSelectors);
  }
  return getSelectors;
}

export interface UndoableMeta {
  undoable?: boolean;
}

export function getUndoableMeta(action: { meta?: UndoableMeta }) {
  return action.meta?.undoable;
}

const isPayloadAction = isFluxStandardAction as <P>(
  action: P | PayloadAction<P>,
) => action is PayloadAction<P>;

function getPayload<P>(payloadOrAction: PayloadAction<P> | P): P {
  return isPayloadAction(payloadOrAction)
    ? payloadOrAction.payload
    : payloadOrAction;
}

interface ReduxMethods<Data, State extends BaseHistoryState<Data, unknown>> {
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param n Number of steps to moveNegative numbers move backwards.
   */
  jump<S extends MaybeDraft<State>>(
    state: S,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    n: number,
  ): S;
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param action An action with a payload of the number of steps to move. Negative numbers move backwards.
   */
  jump<S extends MaybeDraft<State>>(
    state: S,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    action: PayloadAction<number>,
  ): S;
  /** An action creator prepare callback which doesn't take a payload */
  withoutPayload(): (undoable?: boolean) => {
    payload: undefined;
    meta: UndoableMeta;
  };
  /** An action creator prepare callback which takes a single payload */
  withPayload<P>(): (
    ...args: IfMaybeUndefined<
      P,
      [payload?: P, undoable?: boolean],
      [payload: P, undoable?: boolean]
    >
  ) => { payload: P; meta: UndoableMeta };
  /** Wraps a reducer in logic which automatically updates the state history, and extracts whether an action is undoable from its meta (`action.meta.undoable`) */
  undoableReducer<
    A extends Action & { meta?: UndoableMeta },
    RootState = HistoryState<Data>,
  >(
    reducer: CaseReducer<Data, A>,
    config?: Omit<
      UndoableConfig<Data, [action: A], RootState, State>,
      "isUndoable"
    >,
  ): <State extends MaybeDraft<RootState>>(state: State, action: A) => State;

  getSelectors(): HistorySelectors<Data, State>;
  getSelectors<RootState>(
    selectState: (rootState: RootState) => State,
    options?: GetSelectorsOptions,
  ): HistorySelectors<Data, RootState>;
}

export interface HistoryAdapter<
  Data,
  State extends BaseHistoryState<Data, unknown> = HistoryState<Data>,
> extends Omit<Adapter<Data, State>, "jump">,
    ReduxMethods<Data, State> {}

function getReduxMethods<Data, State extends BaseHistoryState<Data, unknown>>(
  adapter: Adapter<Data, State>,
): ReduxMethods<Data, State> {
  return {
    jump(state, payloadOrAction) {
      return adapter.jump(state, getPayload(payloadOrAction));
    },
    withoutPayload() {
      return (undoable) => ({
        payload: undefined,
        meta: { undoable },
      });
    },
    withPayload<P>() {
      return (
        ...[payload, undoable]: IfMaybeUndefined<
          P,
          [payload?: P, undoable?: boolean],
          [payload: P, undoable?: boolean]
        >
      ) => ({ payload: payload as P, meta: { undoable } });
    },
    undoableReducer(reducer, config) {
      return adapter.undoable(reducer, {
        ...config,
        isUndoable: getUndoableMeta,
      });
    },
    getSelectors: makeSelectorFactory<Data, State>(),
  };
}

export const createHistoryAdapter = <Data>(
  config?: HistoryAdapterConfig,
): HistoryAdapter<Data> => {
  const adapter = createAdapter<Data>(config);
  return {
    ...adapter,
    ...getReduxMethods(adapter),
  };
};

export const createNoPatchHistoryAdapter = <Data>(
  config?: HistoryAdapterConfig,
): HistoryAdapter<Data, NonPatchHistoryState<Data>> => {
  const adapter = createNoPatchAdapter<Data>(config);
  return {
    ...adapter,
    ...getReduxMethods(adapter),
  };
};
