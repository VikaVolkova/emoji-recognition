import { useRef, useEffect, useState, useCallback } from "react";
import { Hands, type Results, HAND_CONNECTIONS } from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { isIndexFingerUp } from "./gestures";

type Point = { x: number; y: number };

const WebcamFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [drawingPath, setDrawingPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const onResultsRef = useRef<(results: Results) => void>(null);

  const drawPath = (canvasCtx: CanvasRenderingContext2D, path: Point[]) => {
    if (path.length < 2) return;
    canvasCtx.beginPath();
    canvasCtx.moveTo(
      path[0].x * canvasCtx.canvas.width,
      path[0].y * canvasCtx.canvas.height
    );
    for (let i = 1; i < path.length; i++) {
      canvasCtx.lineTo(
        path[i].x * canvasCtx.canvas.width,
        path[i].y * canvasCtx.canvas.height
      );
    }
    canvasCtx.strokeStyle = "#4287f5";
    canvasCtx.lineWidth = 8;
    canvasCtx.stroke();
  };

  const handleResults = useCallback(
    (results: Results) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvasCtx = canvasRef.current.getContext("2d")!;
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      canvasCtx.save();
      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      canvasCtx.translate(canvasRef.current.width, 0);
      canvasCtx.scale(-1, 1);

      if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });

        const userIsPointing = isIndexFingerUp(landmarks);
        const indexTip = landmarks[8];

        if (userIsPointing) {
          if (!isDrawing) {
            setIsDrawing(true);
            setDrawingPath([{ x: indexTip.x, y: indexTip.y }]);
          } else {
            setDrawingPath((prevPath) => [
              ...prevPath,
              { x: indexTip.x, y: indexTip.y },
            ]);
          }
        } else if (isDrawing) {
          setIsDrawing(false);
          console.log("Final Path:", drawingPath);
        }
      } else if (isDrawing) {
        setIsDrawing(false);
      }

      if (drawingPath.length > 0) {
        drawPath(canvasCtx, drawingPath);
      }
      canvasCtx.restore();
    },
    [isDrawing, drawingPath]
  );

  useEffect(() => {
    onResultsRef.current = handleResults;
  }, [handleResults]);

  useEffect(() => {
    const videoElement = videoRef.current;
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
      if (videoElement) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: "user" },
          });
          videoElement.srcObject = stream;
          await videoElement.play();

          const sendToMediaPipe = async () => {
            if (videoElement.readyState >= 3) {
              await hands.send({ image: videoElement });
            }
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
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="webcam-container">
      <p className="instructions">
        {isDrawing
          ? "✍️ Drawing..."
          : "Hold up your index finger to start drawing!"}
      </p>
      <video ref={videoRef} className="webcam-video"></video>
      <canvas ref={canvasRef} className="webcam-canvas"></canvas>
    </div>
  );
};

export default WebcamFeed;
