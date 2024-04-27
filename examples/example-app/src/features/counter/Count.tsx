import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  historyCleared,
  decremented,
  incremented,
  jumped,
  pauseToggled,
  redone,
  reset,
  selectCanRedo,
  selectCanUndo,
  selectCount,
  selectPaused,
  undone,
} from "./counterSlice";

export function Count() {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCount);
  const paused = useAppSelector(selectPaused);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  return (
    <>
      <p>count is {count}</p>
      <button onClick={() => dispatch(incremented(1))}>increment</button>
      <button onClick={() => dispatch(decremented(1))}>decrement</button>
      <button onClick={() => dispatch(pauseToggled())}>
        {paused ? "resume" : "pause"} history
      </button>
      <button disabled={!canUndo} onClick={() => dispatch(undone())}>
        undo
      </button>
      <button disabled={!canRedo} onClick={() => dispatch(redone())}>
        redo
      </button>
      <button disabled={!canUndo} onClick={() => dispatch(jumped(-2))}>
        jump back 2
      </button>
      <button disabled={!canRedo} onClick={() => dispatch(jumped(2))}>
        jump forward 2
      </button>
      <button onClick={() => dispatch(historyCleared())}>clear history</button>
      <button onClick={() => dispatch(reset())}>reset</button>
    </>
  );
}
