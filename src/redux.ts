import type { Action, CaseReducer } from "@reduxjs/toolkit";
import type { HistoryAdapter as Adapter, HistoryState } from ".";
import { createHistoryAdapter as createAdapter } from ".";
import type { IfMaybeUndefined } from "./utils";

export type { HistoryState } from ".";
export { getInitialState } from ".";

export interface UndoableMeta {
  undoable?: boolean;
}

export interface HistoryAdapter<Data> extends Adapter<Data> {
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
  undoableReducer<A extends Action & { meta?: UndoableMeta }>(
    reducer: CaseReducer<Data, A>,
  ): <State extends HistoryState<Data>>(state: State, action: A) => State;
}

export function getUndoableMeta(action: { meta?: UndoableMeta }) {
  return action.meta?.undoable;
}

// eslint-disable-next-line import/export
export function createHistoryAdapter<Data>(): HistoryAdapter<Data> {
  const adapter = createAdapter<Data>();
  return {
    ...adapter,
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
    undoableReducer(reducer) {
      return adapter.undoable(reducer, getUndoableMeta);
    },
  };
}
