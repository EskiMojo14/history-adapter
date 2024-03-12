import { reducerCreator } from "@reduxjs/toolkit";
import type {
  PayloadActionCreator,
  SliceActionType,
  CaseReducer,
  CaseReducerDefinition,
  PayloadAction,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  CreatorCaseReducers,
  Draft,
  PreparedCaseReducerDefinition,
  PrepareAction,
} from "@reduxjs/toolkit";
import type { HistoryAdapter, HistoryState } from "./redux";
import type { WithRequiredProp } from "./utils";

const historyMethodsCreatorType = Symbol();
const undoableCreatorsCreatorType = Symbol();

interface HistoryReducers<State> {
  undo: CaseReducerDefinition<State, PayloadAction>;
  redo: CaseReducerDefinition<State, PayloadAction>;
  jump: CaseReducerDefinition<State, PayloadAction<number>>;
  clearHistory: CaseReducerDefinition<State, PayloadAction>;
  reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
    type: "reset";
  };
}

interface HistoryMethodsCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

interface undoableCreatorsCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

interface UndoableCreators<Data, State> {
  reducer(
    reducer: CaseReducer<Data, PayloadAction>,
  ): CaseReducerDefinition<State, PayloadAction>;
  reducer<Payload>(
    reducer: CaseReducer<Data, PayloadAction<Payload>>,
  ): CaseReducerDefinition<State, PayloadAction<Payload>>;
  preparedReducer<Prepare extends PrepareAction<any>>(
    prepare: Prepare,
    reducer: CaseReducer<
      Data,
      ReturnType<
        PayloadActionCreator<ReturnType<Prepare>["payload"], string, Prepare>
      >
    >,
  ): PreparedCaseReducerDefinition<State, Prepare>;
}

declare module "@reduxjs/toolkit" {
  export interface SliceReducerCreators<
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
  > {
    [historyMethodsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            (
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: HistoryMethodsCreatorConfig<State, Data>,
            ): HistoryReducers<State>;
            <Data>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config: WithRequiredProp<
                HistoryMethodsCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): HistoryReducers<State>;
          }
        : <Data>(
            this: ReducerCreators<State>,
            adapter: HistoryAdapter<Data>,
            config: WithRequiredProp<
              HistoryMethodsCreatorConfig<State, Data>,
              "selectHistoryState"
            >,
          ) => HistoryReducers<State>,
      {
        actions: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyMethodsCreatorType
          >
            ? CaseReducers[ReducerName] extends { type: "reset" }
              ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
              : never
            : never;
        };
        caseReducers: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyMethodsCreatorType
          >
            ? CaseReducers[ReducerName] extends { type: "reset" }
              ? CaseReducer<State, PayloadAction>
              : never
            : never;
        };
      }
    >;
    [undoableCreatorsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            (
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: undoableCreatorsCreatorConfig<State, Data>,
            ): UndoableCreators<Data, State>;
            <Data>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: undoableCreatorsCreatorConfig<State, Data>,
            ): UndoableCreators<Data, State>;
          }
        : <Data>(
            this: ReducerCreators<State>,
            adapter: HistoryAdapter<Data>,
            config: WithRequiredProp<
              undoableCreatorsCreatorConfig<State, Data>,
              "selectHistoryState"
            >,
          ) => UndoableCreators<Data, State>
    >;
  }
}

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create<Data, State = HistoryState<Data>>(
    this: ReducerCreators<State>,
    adapter: HistoryAdapter<Data>,
    {
      selectHistoryState = (state) => state as HistoryState<Data>,
    }: HistoryMethodsCreatorConfig<State, Data> = {},
  ) {
    return {
      undo: this.reducer((state) => {
        adapter.undo(selectHistoryState(state));
      }),
      redo: this.reducer((state) => {
        adapter.redo(selectHistoryState(state));
      }),
      jump: this.reducer<number>((state, action) => {
        adapter.jump(selectHistoryState(state), action);
      }),
      clearHistory: this.reducer((state) => {
        adapter.clearHistory(selectHistoryState(state));
      }),
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

export const undoableCreatorsCreator: ReducerCreator<
  typeof undoableCreatorsCreatorType
> = {
  type: undoableCreatorsCreatorType,
  create(this, adapter, config) {
    return {
      reducer: (reducer: CaseReducer<any, any>) =>
        this.reducer(adapter.undoableReducer(reducer, config)),
      preparedReducer: (prepare, reducer) =>
        this.preparedReducer(prepare, adapter.undoableReducer(reducer, config)),
    };
  },
};
