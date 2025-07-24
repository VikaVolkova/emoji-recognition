import "./App.css";
import WebcamFeed from "./components/WebcamFeed/WebcamFeed";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AI-Powered Hand Gesture & Drawing Recognition </h1>
        <WebcamFeed />
      </header>
    </div>
  );
}

export default App;
