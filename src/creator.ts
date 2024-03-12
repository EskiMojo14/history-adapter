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
const undoableReducersCreatorType = Symbol();

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

interface UndoableReducersCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

interface WrappedCreators<Data, State> {
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

type WrappedDefinitions<State> = Record<
  string,
  CaseReducerDefinition<State, any> | PreparedCaseReducerDefinition<State, any>
>;
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
    [undoableReducersCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            (
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: UndoableReducersCreatorConfig<State, Data>,
            ): WrappedCreators<Data, State>;
            <Data>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: UndoableReducersCreatorConfig<State, Data>,
            ): WrappedCreators<Data, State>;
            <ReducerDefinitions extends WrappedDefinitions<State>>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              reducers: (
                creators: WrappedCreators<Data, State>,
              ) => ReducerDefinitions,
              config?: UndoableReducersCreatorConfig<State, Data>,
            ): ReducerDefinitions;
            <Data, ReducerDefinitions extends WrappedDefinitions<State>>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              reducers: (
                creators: WrappedCreators<Data, State>,
              ) => ReducerDefinitions,
              config: WithRequiredProp<
                UndoableReducersCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): ReducerDefinitions;
          }
        : {
            <Data>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config: WithRequiredProp<
                UndoableReducersCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): WrappedCreators<Data, State>;
            <Data, ReducerDefinitions extends WrappedDefinitions<State>>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              reducers: (
                creators: WrappedCreators<Data, State>,
              ) => ReducerDefinitions,
              config: WithRequiredProp<
                UndoableReducersCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): ReducerDefinitions;
          }
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

export const undoableReducersCreator: ReducerCreator<
  typeof undoableReducersCreatorType
> = {
  type: undoableReducersCreatorType,
  create<Data, State = HistoryState<Data>>(
    this: ReducerCreators<any>,
    adapter: HistoryAdapter<Data>,
    reducersOrConfig?:
      | ((creators: WrappedCreators<Data, State>) => WrappedDefinitions<State>)
      | UndoableReducersCreatorConfig<State, Data>,
    config?: UndoableReducersCreatorConfig<State, Data>,
  ) {
    const finalConfig =
      typeof reducersOrConfig === "function" ? config : reducersOrConfig;
    const creators: WrappedCreators<Data, State> = {
      reducer: (reducer: CaseReducer<Data, any>) =>
        this.reducer(adapter.undoableReducer(reducer, finalConfig)),
      preparedReducer: <P extends PrepareAction<any>>(
        prepare: P,
        reducer: CaseReducer<Data, any>,
      ) =>
        this.preparedReducer(
          prepare,
          adapter.undoableReducer(reducer, finalConfig),
        ),
    };

    return typeof reducersOrConfig === "function"
      ? reducersOrConfig(creators)
      : (creators as any);
  },
};
