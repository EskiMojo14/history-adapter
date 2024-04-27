import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  clearHistory,
  decremented,
  incremented,
  jump,
  pauseToggled,
  redo,
  reset,
  selectCanRedo,
  selectCanUndo,
  selectCount,
  selectPaused,
  undo,
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
      <button disabled={!canUndo} onClick={() => dispatch(undo())}>
        undo
      </button>
      <button disabled={!canRedo} onClick={() => dispatch(redo())}>
        redo
      </button>
      <button disabled={!canUndo} onClick={() => dispatch(jump(-2))}>
        jump back 2
      </button>
      <button disabled={!canRedo} onClick={() => dispatch(jump(2))}>
        jump forward 2
      </button>
      <button onClick={() => dispatch(clearHistory())}>clear history</button>
      <button onClick={() => dispatch(reset())}>reset</button>
    </>
  );
}
