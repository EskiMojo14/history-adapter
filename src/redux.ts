import type { Action, CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import {
  isFluxStandardAction,
  createSelector as _createSelector,
} from "@reduxjs/toolkit";
import type {
  HistoryAdapter as Adapter,
  HistoryAdapterConfig,
  HistoryState,
  UndoableConfig,
} from ".";
import { createHistoryAdapter as createAdapter } from ".";
import type { IfMaybeUndefined } from "./utils";
import type { CreateSelectorFunction } from "reselect";

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
}

function makeSelectorFactory<Data>() {
  function getSelectors(): HistorySelectors<Data>;
  function getSelectors<RootState>(
    selectState: (rootState: RootState) => HistoryState<Data>,
    options?: GetSelectorsOptions,
  ): HistorySelectors<Data, RootState>;
  function getSelectors<RootState>(
    selectState?: (rootState: RootState) => HistoryState<Data>,
    { createSelector = _createSelector }: GetSelectorsOptions = {},
  ): HistorySelectors<Data, any> {
    const localisedSelectors = {
      selectCanUndo: (state) => state.past.length > 0,
      selectCanRedo: (state) => state.future.length > 0,
      selectPresent: (state) => state.present,
    } satisfies Record<string, (state: HistoryState<Data>) => unknown>;
    if (!selectState) {
      return localisedSelectors;
    }
    return {
      selectCanUndo: createSelector(
        selectState,
        localisedSelectors.selectCanUndo,
      ),
      selectCanRedo: createSelector(
        selectState,
        localisedSelectors.selectCanRedo,
      ),
      selectPresent: createSelector(
        selectState,
        localisedSelectors.selectPresent,
      ),
    };
  }
  return getSelectors;
}

export interface UndoableMeta {
  undoable?: boolean;
}

export interface HistoryAdapter<Data> extends Adapter<Data> {
  /**
   * Moves the state back or forward in history by n steps.
   * @param state History state shape, with patches
   * @param n Number of steps to move, or an action with a payload of the number of steps to move. Negative numbers move backwards.
   */
  jump<State extends HistoryState<Data>>(
    state: State,
    n: number | PayloadAction<number>,
  ): State;
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
    config?: Omit<UndoableConfig<Data, [action: A], RootState>, "isUndoable">,
  ): <State extends RootState>(state: State, action: A) => State;

  getSelectors(): HistorySelectors<Data>;
  getSelectors<RootState>(
    selectState: (rootState: RootState) => HistoryState<Data>,
    options?: GetSelectorsOptions,
  ): HistorySelectors<Data, RootState>;
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

export function createHistoryAdapter<Data>(
  config?: HistoryAdapterConfig,
): HistoryAdapter<Data> {
  const adapter = createAdapter<Data>(config);
  return {
    ...adapter,
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
    getSelectors: makeSelectorFactory<Data>(),
  };
}
