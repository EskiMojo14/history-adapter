import { Count } from "./features/counter/Count";
import { HistoryButtons } from "./features/counter/HistoryButtons";
import { Past } from "./features/counter/Past";
import { Future } from "./features/counter/Future";
import "./App.css";

function App() {
  return (
    <>
      <div className="values">
        <Past />
        <Count />
        <Future />
      </div>
      <HistoryButtons />
    </>
  );
}

export default App;
