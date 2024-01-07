import {
  Action,
  CaseReducer,
  CaseReducerDefinition,
  PayloadAction,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  SliceCaseReducers,
} from "@reduxjs/toolkit";
import {
  HistoryAdapter,
  HistoryState,
  createHistoryAdapter as createOriginalAdapter,
} from ".";
import { Compute, IfMaybeUndefined } from "./utils";

export * from ".";

export interface UndoableMeta {
  undoable?: boolean;
}

export interface ReduxHistoryAdapter<Data> extends HistoryAdapter<Data> {
  withoutPayload(): (undoable?: boolean) => {
    payload: undefined;
    meta: UndoableMeta;
  };
  withPayload<P>(): (
    ...args: IfMaybeUndefined<
      P,
      [payload?: P, undoable?: boolean],
      [payload: P, undoable?: boolean]
    >
  ) => { payload: P; meta: UndoableMeta };
  undoableReducer<A extends Action & { meta?: UndoableMeta }>(
    reducer: CaseReducer<Data, A>,
  ): <State extends HistoryState<Data>>(state: State, action: A) => State;
}

function getUndoableMeta(action: { meta?: UndoableMeta }) {
  return action.meta?.undoable;
}

export function createHistoryAdapter<Data>(): ReduxHistoryAdapter<Data> {
  const adapter = createOriginalAdapter<Data>();
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

const anyHistoryCreator = createHistoryAdapter<any>();

const historyMethodsCreatorType = Symbol();
const undoableCreatorType = Symbol();

declare module "@reduxjs/toolkit" {
  export interface SliceReducerCreators<
    State = any,
    CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
    Name extends string = string,
  > {
    [historyMethodsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<any>
        ? (this: ReducerCreators<State>) => {
            undo: CaseReducerDefinition<State, PayloadAction>;
            redo: CaseReducerDefinition<State, PayloadAction>;
          }
        : never
    >;
    [undoableCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? (<A extends Action & { meta?: UndoableMeta }>(
            reducer: CaseReducer<Data, A>,
          ) => CaseReducer<State, A>) &
            Compute<
              Pick<ReduxHistoryAdapter<Data>, "withPayload" | "withoutPayload">
            >
        : never
    >;
  }
}

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create() {
    return {
      undo: this.reducer(anyHistoryCreator.undo),
      redo: this.reducer(anyHistoryCreator.redo),
    };
  },
};

export const undoableCreator: ReducerCreator<typeof undoableCreatorType> = {
  type: undoableCreatorType,
  create: Object.assign(anyHistoryCreator.undoableReducer, {
    withoutPayload: anyHistoryCreator.withoutPayload,
    withPayload: anyHistoryCreator.withPayload,
  }),
};
