import { useRef, useEffect, useState, useCallback } from "react";
import { Hands, type Results, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { isIndexFingerUp } from "./gestures";

type Point = { x: number; y: number };
type Mode = "draw" | "erase";

const WebcamFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // two canvas refs
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const onResultsRef = useRef<((results: Results) => void) | null>(null);

  const [mode, setMode] = useState<Mode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  // We only need to track the current stroke being drawn
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  const ERASE_RADIUS = 25;

  const commitCurrentStroke = (stroke: Point[]) => {
    const drawingCtx = drawingCanvasRef.current?.getContext("2d");
    if (!drawingCtx || stroke.length < 2) return;

    drawingCtx.save();
    drawingCtx.translate(drawingCtx.canvas.width, 0);
    drawingCtx.scale(-1, 1);

    drawingCtx.globalCompositeOperation = "source-over"; // Ensure we are drawing on top
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
    console.log("--- Analyzing Drawing ---");
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const imageDataUrl = drawingCanvas.toDataURL("image/png");
    console.log("Image data for AI model:");
    console.log(imageDataUrl);
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
  };

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
