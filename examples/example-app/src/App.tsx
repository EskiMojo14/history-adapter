import { Count } from "./features/counter/Count";
import { HistoryButtons } from "./features/counter/HistoryButtons";
import "./App.css";
import { Past } from "./features/counter/Past";
import { Future } from "./features/counter/Future";

function App() {
  return (
    <>
      <div className="values" dir="ltr">
        <Past />
        <Count />
        <Future />
      </div>
      <HistoryButtons />
    </>
  );
}

export default App;
