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
import { HistoryState, createHistoryAdapter } from ".";

type IfMaybeUndefined<T, True, False> = [undefined] extends [T] ? True : False;

export interface UndoableMeta {
  undoable?: boolean;
}

function getUndoableMeta(action: { meta?: UndoableMeta }) {
  return action.meta?.undoable;
}

export function createReduxHistoryAdapter<Data>() {
  const adapter = createHistoryAdapter<Data>();
  return {
    ...adapter,
    withoutPayload() {
      return (undoable?: boolean) => ({
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
    undoableReducer<A extends Action & { meta?: UndoableMeta }>(
      reducer: CaseReducer<Data, A>,
    ) {
      return adapter.undoable(reducer, getUndoableMeta);
    },
  };
}

const anyHistoryCreator = createReduxHistoryAdapter<any>();

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
        ? {
            <A extends Action & { meta?: UndoableMeta }>(
              reducer: CaseReducer<Data, A>,
            ): CaseReducer<State, A>;
            withoutPayload(): (undoable?: boolean) => {
              payload: undefined;
              meta: UndoableMeta;
            };
            withPayload<P>(): (
              ...args: [
                ...IfMaybeUndefined<P, [payload?: P], [payload: P]>,
                undoable?: boolean,
              ]
            ) => { payload: P; meta: UndoableMeta };
          }
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

Object.assign(anyHistoryCreator.undoableReducer, {
  withoutPayload() {
    return (undoable?: boolean) => ({ payload: undefined, meta: { undoable } });
  },
  withPayload() {
    return (payload?: any, undoable?: boolean) => ({
      payload,
      meta: { undoable },
    });
  },
});

export const undoableCreator: ReducerCreator<typeof undoableCreatorType> = {
  type: undoableCreatorType,
  create: anyHistoryCreator.undoableReducer as ReducerCreator<
    typeof undoableCreatorType
  >["create"],
};