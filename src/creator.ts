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
import type { BaseHistoryState } from ".";

const historyMethodsCreatorType = Symbol("historyMethodsCreator");
const undoableCreatorsCreatorType = Symbol("undoableCreatorsCreator");

interface HistoryReducers<State> {
  undone: CaseReducerDefinition<State, PayloadAction>;
  redone: CaseReducerDefinition<State, PayloadAction>;
  paused: CaseReducerDefinition<State, PayloadAction>;
  resumed: CaseReducerDefinition<State, PayloadAction>;
  pauseToggled: CaseReducerDefinition<State, PayloadAction>;
  jumped: CaseReducerDefinition<State, PayloadAction<number>>;
  historyCleared: CaseReducerDefinition<State, PayloadAction>;
  reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
    type: "reset";
  };
}

interface HistoryMethodsCreatorConfig<
  RootState,
  Data,
  State extends BaseHistoryState<unknown, unknown> = HistoryState<Data>,
> {
  selectHistoryState?: (state: Draft<RootState>) => Draft<State>;
}

interface UndoableCreatorsCreatorConfig<
  RootState,
  Data,
  State extends BaseHistoryState<unknown, unknown> = HistoryState<Data>,
> {
  selectHistoryState?: (state: Draft<RootState>) => Draft<State>;
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
      State extends BaseHistoryState<infer Data, any>
        ? {
            (
              adapter: HistoryAdapter<Data, State>,
              config?: HistoryMethodsCreatorConfig<State, Data, State>,
            ): HistoryReducers<State>;
            <Data, HState extends BaseHistoryState<Data, unknown>>(
              adapter: HistoryAdapter<Data, HState>,
              config: WithRequiredProp<
                HistoryMethodsCreatorConfig<State, Data, HState>,
                "selectHistoryState"
              >,
            ): HistoryReducers<State>;
          }
        : <Data, HState extends BaseHistoryState<Data, unknown>>(
            adapter: HistoryAdapter<Data, HState>,
            config: WithRequiredProp<
              HistoryMethodsCreatorConfig<State, Data, HState>,
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
      State extends BaseHistoryState<infer Data, any>
        ? {
            (
              adapter: HistoryAdapter<Data, State>,
              config?: UndoableCreatorsCreatorConfig<State, Data, State>,
            ): UndoableCreators<Data, State>;
            <Data, HState extends BaseHistoryState<Data, unknown>>(
              adapter: HistoryAdapter<Data, HState>,
              config: WithRequiredProp<
                UndoableCreatorsCreatorConfig<State, Data, HState>,
                "selectHistoryState"
              >,
            ): UndoableCreators<Data, State>;
          }
        : <Data, HState extends BaseHistoryState<Data, unknown>>(
            adapter: HistoryAdapter<Data, HState>,
            config: WithRequiredProp<
              UndoableCreatorsCreatorConfig<State, Data, HState>,
              "selectHistoryState"
            >,
          ) => UndoableCreators<Data, State>
    >;
  }
}

const makeScopedReducerCreator =
  <State, Data, HState extends BaseHistoryState<Data, unknown>>(
    selectHistoryState: (state: Draft<State>) => Draft<HState>,
  ) =>
  <P>(mutator: (state: Draft<HState>, action: PayloadAction<P>) => void) =>
    (reducerCreator.create as ReducerCreators<State>["reducer"])<P>(
      (state, action) => {
        mutator(selectHistoryState(state), action);
      },
    );

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create<
    Data,
    State = HistoryState<Data>,
    HState extends BaseHistoryState<Data, unknown> = HistoryState<Data>,
  >(
    adapter: HistoryAdapter<Data, HState>,
    {
      selectHistoryState = (state) => state as never,
    }: HistoryMethodsCreatorConfig<State, Data, HState> = {},
  ): HistoryReducers<State> {
    const createReducer = makeScopedReducerCreator(selectHistoryState);
    return {
      undone: createReducer(adapter.undo),
      redone: createReducer(adapter.redo),
      jumped: createReducer(adapter.jump),
      paused: createReducer(adapter.pause),
      resumed: createReducer(adapter.resume),
      pauseToggled: createReducer((state) => {
        state.paused = !state.paused;
      }),
      historyCleared: createReducer(adapter.clearHistory),
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
