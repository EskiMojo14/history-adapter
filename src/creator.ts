import { preparedReducerCreator, reducerCreator } from "@reduxjs/toolkit";
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

const historyMethodsCreatorType = Symbol("historyMethodsCreator");
const undoableCreatorsCreatorType = Symbol("undoableCreatorsCreator");

interface HistoryReducers<State> {
  undo: CaseReducerDefinition<State, PayloadAction>;
  redo: CaseReducerDefinition<State, PayloadAction>;
  pause: CaseReducerDefinition<State, PayloadAction>;
  resume: CaseReducerDefinition<State, PayloadAction>;
  jump: CaseReducerDefinition<State, PayloadAction<number>>;
  clearHistory: CaseReducerDefinition<State, PayloadAction>;
  reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
    type: "reset";
  };
}

interface HistoryMethodsCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

interface UndoableCreatorsCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

type ActionForPrepare<Prepare extends PrepareAction<any>> = ReturnType<
  PayloadActionCreator<0, string, Prepare>
>;

interface UndoableCreators<Data, State> {
  reducer: {
    (
      reducer: CaseReducer<Data, PayloadAction>,
    ): CaseReducerDefinition<State, PayloadAction>;
    <Payload>(
      reducer: CaseReducer<Data, PayloadAction<Payload>>,
    ): CaseReducerDefinition<State, PayloadAction<Payload>>;
  };
  preparedReducer: <Prepare extends PrepareAction<any>>(
    prepare: Prepare,
    reducer: CaseReducer<Data, ActionForPrepare<Prepare>>,
  ) => PreparedCaseReducerDefinition<State, Prepare>;
}

declare module "@reduxjs/toolkit" {
  export interface SliceReducerCreators<
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
    ReducerPath extends string,
  > {
    [historyMethodsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            (
              adapter: HistoryAdapter<Data>,
              config?: HistoryMethodsCreatorConfig<State, Data>,
            ): HistoryReducers<State>;
            <Data>(
              adapter: HistoryAdapter<Data>,
              config: WithRequiredProp<
                HistoryMethodsCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): HistoryReducers<State>;
          }
        : <Data>(
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
              adapter: HistoryAdapter<Data>,
              config?: UndoableCreatorsCreatorConfig<State, Data>,
            ): UndoableCreators<Data, State>;
            <Data>(
              adapter: HistoryAdapter<Data>,
              config: WithRequiredProp<
                UndoableCreatorsCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): UndoableCreators<Data, State>;
          }
        : <Data>(
            adapter: HistoryAdapter<Data>,
            config: WithRequiredProp<
              UndoableCreatorsCreatorConfig<State, Data>,
              "selectHistoryState"
            >,
          ) => UndoableCreators<Data, State>
    >;
  }
}

const makeScopedReducerCreator =
  <State, Data>(
    selectHistoryState: (state: Draft<State>) => HistoryState<Data>,
  ) =>
  <P>(mutator: (state: HistoryState<Data>, action: PayloadAction<P>) => void) =>
    (reducerCreator.create as ReducerCreators<State>["reducer"])<P>(
      (state, action) => {
        mutator(selectHistoryState(state), action);
      },
    );

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create<Data, State = HistoryState<Data>>(
    adapter: HistoryAdapter<Data>,
    {
      selectHistoryState = (state) => state as HistoryState<Data>,
    }: HistoryMethodsCreatorConfig<State, Data> = {},
  ): HistoryReducers<State> {
    const createReducer = makeScopedReducerCreator(selectHistoryState);
    return {
      undo: createReducer(adapter.undo),
      redo: createReducer(adapter.redo),
      jump: createReducer(adapter.jump),
      pause: createReducer(adapter.pause),
      resume: createReducer(adapter.resume),
      clearHistory: createReducer(adapter.clearHistory),
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
  create(adapter, config) {
    return {
      reducer(reducer: CaseReducer<any, any>) {
        return reducerCreator.create(adapter.undoableReducer(reducer, config));
      },
      preparedReducer(prepare, reducer) {
        return preparedReducerCreator.create(
          prepare,
          adapter.undoableReducer(reducer, config),
        );
      },
    };
  },
};
