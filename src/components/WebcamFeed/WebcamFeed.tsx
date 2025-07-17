import { useRef, useEffect, useState, useCallback } from "react";
import { Hands, type Results, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { isIndexFingerUp } from "./gestures";
import * as tf from "@tensorflow/tfjs";
import { preProcessCanvas } from "../../utils/preProcessCanvas";
import bowIcon from "../../assets/bow.png";
import heartIcon from "../../assets/heart.png";
import mountainIcon from "../../assets/mountain.png";
import ramenIcon from "../../assets/ramen.png";

type Point = { x: number; y: number };
type Mode = "draw" | "erase";

const ERASE_RADIUS = 25;

const EMOJI_CLASSES = ["bow", "heart", "mountain", "ramen"];
// const EMOJI_CLASSES = ["bow", "butterfly", "heart", "mountain", "ramen"];

const iconMap: Record<string, string> = {
  bow: bowIcon,
  heart: heartIcon,
  mountain: mountainIcon,
  ramen: ramenIcon,
};

const WebcamFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const onResultsRef = useRef<((results: Results) => void) | null>(null);

  const [mode, setMode] = useState<Mode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [prediction, setPrediction] = useState<{
    text: string;
    icon?: string | null;
  }>({
    text: "Draw an emoji and click Analyze!",
    icon: null,
  });

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await tf.loadLayersModel("/tfjs_model/model.json");

        setModel(loadedModel);
      } catch (error) {
        console.error(error);
        setPrediction({
          text: "Error: Could not load the AI model. Please check the console.",
        });
      }
    };
    loadModel();
  }, []);

  const predictDrawing = useCallback(async () => {
    const currentModel = model;
    const drawingCanvas = drawingCanvasRef.current;

    if (!currentModel || !drawingCanvas) {
      console.log("Model or canvas not ready.");
      return;
    }

    setPrediction({ text: "Analyzing..." });

    const tensor = preProcessCanvas(drawingCanvas);
    const prediction = currentModel.predict(tensor) as tf.Tensor;

    const probabilities = await prediction.data();
    const maxProbIndex = (await prediction.argMax(-1).data())[0];

    tensor.dispose();
    prediction.dispose();

    const predictedClass = EMOJI_CLASSES[maxProbIndex];
    const confidence = probabilities[maxProbIndex];

    console.log(`Prediction: ${predictedClass}, Confidence: ${confidence}`);

    setPrediction({
      text: `I see a ${predictedClass}! (Confidence: ${Math.round(
        confidence * 100
      )}%)`,
      icon: iconMap[predictedClass], // Look up the icon using the predicted class name
    });
  }, [model, setPrediction]);

  const commitCurrentStroke = (stroke: Point[]) => {
    const drawingCtx = drawingCanvasRef.current?.getContext("2d");
    if (!drawingCtx || stroke.length < 2) return;

    drawingCtx.save();
    drawingCtx.translate(drawingCtx.canvas.width, 0);
    drawingCtx.scale(-1, 1);

    drawingCtx.globalCompositeOperation = "source-over"; // ensuring we are drawing on top
    drawingCtx.strokeStyle = "#56DFCF";
    drawingCtx.lineWidth = 8;
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";
    drawingCtx.beginPath();
    drawingCtx.moveTo(
      stroke[0].x * drawingCtx.canvas.width,
      stroke[0].y * drawingCtx.canvas.height
    );
    for (let i = 1; i < stroke.length; i++) {
      drawingCtx.lineTo(
        stroke[i].x * drawingCtx.canvas.width,
        stroke[i].y * drawingCtx.canvas.height
      );
    }
    drawingCtx.stroke();
    drawingCtx.restore();
  };

  const handleResults = useCallback(
    (results: Results) => {
      if (
        !interactionCanvasRef.current ||
        !videoRef.current ||
        !drawingCanvasRef.current
      )
        return;

      // Get contexts for both canvases
      const drawingCtx = drawingCanvasRef.current.getContext("2d")!;
      const interactionCtx = interactionCanvasRef.current.getContext("2d")!;

      // Only clear the TOP (interaction) canvas
      interactionCtx.clearRect(
        0,
        0,
        interactionCtx.canvas.width,
        interactionCtx.canvas.height
      );

      if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const landmarks = results.multiHandLandmarks[0];
        const userIsPointing = isIndexFingerUp(landmarks);
        const indexTip = landmarks[8];

        // Draw skeleton on the interaction canvas
        interactionCtx.save();
        interactionCtx.translate(interactionCtx.canvas.width, 0);
        interactionCtx.scale(-1, 1);
        drawConnectors(interactionCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawLandmarks(interactionCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
        interactionCtx.restore();

        if (userIsPointing) {
          if (!isDrawing) setIsDrawing(true);

          if (mode === "draw") {
            const newStroke = [...currentStroke, indexTip];
            setCurrentStroke(newStroke);

            if (newStroke.length > 1) {
              interactionCtx.save();
              interactionCtx.translate(interactionCtx.canvas.width, 0);
              interactionCtx.scale(-1, 1);
              interactionCtx.strokeStyle = "#898AC4";
              interactionCtx.lineWidth = 8;
              interactionCtx.lineCap = "round";
              interactionCtx.lineJoin = "round";
              interactionCtx.beginPath();
              interactionCtx.moveTo(
                newStroke[0].x * interactionCtx.canvas.width,
                newStroke[0].y * interactionCtx.canvas.height
              );
              for (let i = 1; i < newStroke.length; i++) {
                interactionCtx.lineTo(
                  newStroke[i].x * interactionCtx.canvas.width,
                  newStroke[i].y * interactionCtx.canvas.height
                );
              }
              interactionCtx.stroke();
              interactionCtx.restore();
            }
          } else if (mode === "erase") {
            // --- PIXEL ERASING LOGIC ---
            drawingCtx.save();
            drawingCtx.translate(drawingCtx.canvas.width, 0);
            drawingCtx.scale(-1, 1);
            // It makes drawing operations erase instead of add.
            drawingCtx.globalCompositeOperation = "destination-out";
            drawingCtx.beginPath();
            drawingCtx.arc(
              indexTip.x * drawingCtx.canvas.width,
              indexTip.y * drawingCtx.canvas.height,
              ERASE_RADIUS,
              0,
              2 * Math.PI
            );
            drawingCtx.fill();
            drawingCtx.restore();
          }
        } else if (isDrawing) {
          setIsDrawing(false);
          if (mode === "draw" && currentStroke.length > 1) {
            // When drawing stops, commit the line to the persistent canvas
            commitCurrentStroke(currentStroke);
          }
          setCurrentStroke([]);
        }
      } else if (isDrawing) {
        // Handle hand loss mid-action
        setIsDrawing(false);
        if (mode === "draw" && currentStroke.length > 1) {
          commitCurrentStroke(currentStroke);
        }
        setCurrentStroke([]);
      }
    },
    [mode, isDrawing, currentStroke]
  );

  useEffect(() => {
    onResultsRef.current = handleResults;
  }, [handleResults]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    hands.onResults((results) => {
      if (onResultsRef.current) {
        onResultsRef.current(results);
      }
    });

    const startCamera = async () => {
      if (videoElement && drawingCanvas && interactionCanvas) {
        try {
          videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: "user" },
          });

          videoElement.onloadedmetadata = () => {
            const videoWidth = videoElement.videoWidth;
            const videoHeight = videoElement.videoHeight;
            drawingCanvas.width = interactionCanvas.width = videoWidth;
            drawingCanvas.height = interactionCanvas.height = videoHeight;
          };

          await videoElement.play();

          const sendToMediaPipe = async () => {
            if (videoElement && !videoElement.paused)
              await hands.send({ image: videoElement });
            requestAnimationFrame(sendToMediaPipe);
          };
          sendToMediaPipe();
        } catch (error) {
          console.error("Error accessing webcam:", error);
        }
      }
    };

    startCamera();

    return () => {
      if (videoElement?.srcObject)
        (videoElement.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
    };
  }, []);

  const handleAnalyze = () => {
    predictDrawing();
  };

  const handleClear = () => {
    const drawingCtx = drawingCanvasRef.current?.getContext("2d");
    if (drawingCtx) {
      drawingCtx.clearRect(
        0,
        0,
        drawingCtx.canvas.width,
        drawingCtx.canvas.height
      );
    }
    setPrediction({ text: "Canvas cleared." });
  };

  // const [number, setNumber] = useState(1);

  // const handleSave = () => {
  //   const drawingCanvas = drawingCanvasRef.current;
  //   if (!drawingCanvas) return;

  //   const tempCanvas = document.createElement("canvas");
  //   const tempCtx = tempCanvas.getContext("2d");
  //   if (!tempCtx) return;

  //   tempCanvas.width = drawingCanvas.width;
  //   tempCanvas.height = drawingCanvas.height;

  //   tempCtx.fillStyle = "none";
  //   tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  //   tempCtx.drawImage(drawingCanvas, 0, 0);

  //   const imageDataUrl = tempCanvas.toDataURL("image/png");

  //   const link = document.createElement("a");
  //   link.style.display = "none";
  //   document.body.appendChild(link);

  //   link.href = imageDataUrl;
  //   link.download = `bow-${number}.png`;

  //   link.click();

  //   document.body.removeChild(link);
  //   setNumber((prev) => prev + 1);

  //   console.log("Download initiated!");
  // };

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
        <button onClick={handleAnalyze} className="analyze-button">
          Analyze!
        </button>
      </div>
      <div className="prediction-display">
        <h2>{prediction.text}</h2>
        {prediction.icon && (
          <img
            src={prediction.icon}
            alt="Predicted emoji icon"
            className="predictionIcon"
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
    </>
  );
};

export default WebcamFeed;
