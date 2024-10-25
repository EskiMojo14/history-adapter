import { useAppSelector } from "../../hooks";
import { selectCount } from "./counterSlice";

export function Count() {
  const count = useAppSelector(selectCount);
  return (
    <p>
      count is <span className="count">{count}</span>
    </p>
  );
}
