import { useRef, useState, useCallback } from "react";
import fistIcon from "../../assets/fist.png";
import handIcon from "../../assets/hand.png";
import indexUpIcon from "../../assets/indexUp.png";
import { clearCanvas, checkIsCanvasEmpty } from "../../utils/drawingUtils";
import { predictDrawing } from "../../utils/predictDrawing";
import { useTFModel } from "../../hooks/useTFModel";
import { useHandTracking } from "../../hooks/useHandTracking";

type Mode = "draw" | "erase";

const WebcamFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  // const [number, setNumber] = useState(1); -- needed for data training

  const isProduction = import.meta.env.PROD;

  let modelBaseURL;

  if (isProduction) {
    const baseUrl = window.location.origin;
    modelBaseURL = `${baseUrl}/api/model.json`;
    console.log("Running in PRODUCTION mode. Using API endpoint.");
  } else {
    modelBaseURL = "/tfjs_model/model.json";
    console.log("Running in DEVELOPMENT mode. Using local public folder.");
  }

  const [mode, setMode] = useState<Mode>("draw");
  const [prediction, setPrediction] = useState<{
    text: string;
    icon?: string | null;
  }>({
    text: "Draw an emoji and click Analyze!",
    icon: null,
  });
  const {
    model,
    isLoading: isModelLoading,
    error: modelError,
  } = useTFModel(modelBaseURL);

  const handleAnalyze = useCallback(async () => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!model || !drawingCanvas) {
      setPrediction({ text: "Model or canvas not ready.", icon: null });
      return;
    }
    if (checkIsCanvasEmpty(drawingCanvas)) {
      setPrediction({ text: "Please draw something first!", icon: null });
      return;
    }

    setPrediction({ text: "Analyzing...", icon: null });
    const result = await predictDrawing(model, drawingCanvas);
    setPrediction(result);
  }, [model]);

  const handleClear = useCallback(() => {
    const drawingCtx = drawingCanvasRef.current?.getContext("2d");
    if (drawingCtx) {
      clearCanvas(drawingCtx);
    }
    setPrediction({ text: "Canvas cleared." });
  }, []);

  useHandTracking({
    videoRef,
    drawingCanvasRef,
    interactionCanvasRef,
    mode,
    onAnalyze: handleAnalyze,
    onClear: handleClear,
  });

  return (
    <>
      <div className="controls">
        <button onClick={() => setMode("draw")} disabled={mode === "draw"}>
          Draw
        </button>
        <button onClick={() => setMode("erase")} disabled={mode === "erase"}>
          Erase
        </button>
        <button onClick={handleClear}>Clear</button>
        <button
          onClick={handleAnalyze}
          className="analyze-button"
          disabled={isModelLoading}
        >
          Analyze!
        </button>
      </div>
      <div className="prediction-display">
        <h2>{modelError || prediction.text}</h2>
        {prediction.icon && (
          <img
            src={prediction.icon}
            alt="Predicted emoji icon"
            className="icon"
          />
        )}
      </div>
      <div className="webcam-container">
        <p className="instructions">
          Mode: <span className="mode-text">{mode.toUpperCase()}</span>
        </p>
        <video ref={videoRef} className="webcam-video"></video>
        <canvas ref={drawingCanvasRef} className="webcam-canvas"></canvas>
        <canvas ref={interactionCanvasRef} className="webcam-canvas"></canvas>
      </div>
      <div className="gestures">
        <h2>Control gestures:</h2>
        <div className="gestures-wrapper">
          <div className="gesture">
            <img
              src={indexUpIcon}
              alt="Draw/erase gesture icon"
              className="icon"
            />
            <p>Draw/Erase</p>
          </div>
          <div className="gesture">
            <img src={handIcon} alt="Analyze gesture icon" className="icon" />
            <p>Analyze</p>
          </div>
          <div className="gesture">
            <img src={fistIcon} alt="Clear gesture icon" className="icon" />
            <p>Clear</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebcamFeed;
