import { useAppSelector } from "../../hooks";
import { selectCount } from "./counterSlice";

export function Count() {
  const count = useAppSelector(selectCount);
  return <p>count is {count}</p>;
}
