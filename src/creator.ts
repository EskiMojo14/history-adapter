import { reducerCreator } from "@reduxjs/toolkit";
import type {
  ReducerNamesOfType,
  PayloadActionCreator,
  SliceActionType,
  Action,
  CaseReducer,
  CaseReducerDefinition,
  PayloadAction,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  SliceCaseReducers,
} from "@reduxjs/toolkit";
import type { HistoryAdapter, HistoryState, UndoableMeta } from "./redux";
import { createHistoryAdapter } from "./redux";
import type { Compute } from "./utils";

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
            reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
              type: "reset";
            };
          }
        : never,
      {
        actions: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: "reset" }
            ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
            : never;
        };
        caseReducers: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: "reset" }
            ? CaseReducer<State, PayloadAction>
            : never;
        };
      }
    >;
    [undoableCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? (<A extends Action & { meta?: UndoableMeta }>(
            reducer: CaseReducer<Data, A>,
          ) => CaseReducer<State, A>) &
            Compute<
              Pick<HistoryAdapter<Data>, "withPayload" | "withoutPayload">
            >
        : never
    >;
  }
}

const anyHistoryCreator = createHistoryAdapter<any>();

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create() {
    return {
      undo: this.reducer(anyHistoryCreator.undo),
      redo: this.reducer(anyHistoryCreator.redo),
      reset: {
        _reducerDefinitionType: historyMethodsCreatorType,
        type: "reset",
      },
    };
  },
  handle(details, def, context) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (def.type !== "reset")
      throw new Error(`Unrecognised reducer type ${String(def.type)}`);
    reducerCreator.handle(
      details,
      reducerCreator.create(() => context.getInitialState()),
      context,
    );
  },
};

export const undoableCreator: ReducerCreator<typeof undoableCreatorType> = {
  type: undoableCreatorType,
  create: Object.assign(anyHistoryCreator.undoableReducer, {
    withoutPayload: anyHistoryCreator.withoutPayload,
    withPayload: anyHistoryCreator.withPayload,
  }),
};