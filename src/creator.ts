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

const historyCreatorsType = Symbol("historyCreators");

interface HistoryReducers<State> {
  undone: CaseReducerDefinition<State, PayloadAction>;
  redone: CaseReducerDefinition<State, PayloadAction>;
  paused: CaseReducerDefinition<State, PayloadAction>;
  resumed: CaseReducerDefinition<State, PayloadAction>;
  pauseToggled: CaseReducerDefinition<State, PayloadAction>;
  jumped: CaseReducerDefinition<State, PayloadAction<number>>;
  historyCleared: CaseReducerDefinition<State, PayloadAction>;
  reset: ReducerDefinition<typeof historyCreatorsType> & {
    type: "reset";
  };
}

interface HistoryCreatorConfig<
  RootState,
  Data,
  State extends BaseHistoryState<unknown, unknown> = HistoryState<Data>,
> {
  selectHistoryState?: (state: Draft<RootState>) => Draft<State>;
}

type ActionForPrepare<Prepare extends PrepareAction<any>> = ReturnType<
  PayloadActionCreator<0, string, Prepare>
>;

interface HistoryCreators<Data, State> {
  createUndoable: {
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
  };
  createHistoryMethods(): HistoryReducers<State>;
}

declare module "@reduxjs/toolkit" {
  export interface SliceReducerCreators<
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
    ReducerPath extends string,
  > {
    [historyCreatorsType]: ReducerCreatorEntry<
      State extends BaseHistoryState<infer Data, any>
        ? {
            (
              adapter: HistoryAdapter<Data, State>,
              config?: HistoryCreatorConfig<State, Data, State>,
            ): HistoryCreators<Data, State>;
            <Data, HState extends BaseHistoryState<Data, unknown>>(
              adapter: HistoryAdapter<Data, HState>,
              config: WithRequiredProp<
                HistoryCreatorConfig<State, Data, HState>,
                "selectHistoryState"
              >,
            ): HistoryCreators<Data, State>;
          }
        : <Data, HState extends BaseHistoryState<Data, unknown>>(
            adapter: HistoryAdapter<Data, HState>,
            config: WithRequiredProp<
              HistoryCreatorConfig<State, Data, HState>,
              "selectHistoryState"
            >,
          ) => HistoryCreators<Data, State>,
      {
        actions: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyCreatorsType
          >
            ? CaseReducers[ReducerName] extends { type: "reset" }
              ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
              : never
            : never;
        };
        caseReducers: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyCreatorsType
          >
            ? CaseReducers[ReducerName] extends { type: "reset" }
              ? CaseReducer<State, PayloadAction>
              : never
            : never;
        };
      }
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

export const historyCreatorsCreator: ReducerCreator<
  typeof historyCreatorsType
> = {
  type: historyCreatorsType,
  create(adapter, config) {
    return {
      createUndoable: {
        reducer(reducer: CaseReducer<any, any>) {
          return reducerCreator.create(
            adapter.undoableReducer(reducer, config),
          );
        },
        preparedReducer(prepare, reducer) {
          return preparedReducerCreator.create(
            prepare,
            adapter.undoableReducer(reducer, config),
          );
        },
      },
      createHistoryMethods() {
        const createReducer = makeScopedReducerCreator(
          config.selectHistoryState,
        );
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
            _reducerDefinitionType: historyCreatorsType,
            type: "reset",
          },
        };
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
