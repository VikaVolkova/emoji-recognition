import { useEffect, useRef, useState, useCallback } from "react";
import { Hands, type Results } from "@mediapipe/hands";
import {
  clearCanvas,
  commitStroke,
  drawHand,
  drawPreviewStroke,
  eraseAtPoint,
  type Point,
} from "../utils/drawingUtils";
import { detectGesture, type Gesture } from "../components/WebcamFeed/gestures";

type Mode = "draw" | "erase";

interface UseHandTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  interactionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: Mode;
  onAnalyze: () => void;
  onClear: () => void;
}

export const useHandTracking = ({
  videoRef,
  drawingCanvasRef,
  interactionCanvasRef,
  mode,
  onAnalyze,
  onClear,
}: UseHandTrackingProps) => {
  const onResultsRef = useRef<((results: Results) => void) | null>(null);
  const lastActionTimeRef = useRef(0);
  const lastGestureRef = useRef<Gesture>("NONE");

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  const handleResults = useCallback(
    (results: Results) => {
      const drawingCtx = drawingCanvasRef.current?.getContext("2d");
      const interactionCtx = interactionCanvasRef.current?.getContext("2d");

      if (!drawingCtx || !interactionCtx) return;

      clearCanvas(interactionCtx);

      const landmarks = results.multiHandLandmarks?.[0];
      if (landmarks) {
        // --- CORRECTED ---
        // 1. Detect the gesture at the top of the scope.
        const currentGesture = detectGesture(landmarks);
        // --- END CORRECTION ---

        drawHand(interactionCtx, landmarks);
        const indexTip = landmarks[8];

        // Now `currentGesture` is accessible everywhere below.

        // --- Drawing and Erasing Logic (unchanged) ---
        if (currentGesture === "INDEX_FINGER_UP") {
          if (!isDrawing) setIsDrawing(true);
          if (mode === "draw") {
            const newStroke = [...currentStroke, indexTip];
            drawPreviewStroke(interactionCtx, newStroke);
            setCurrentStroke(newStroke);
          } else if (mode === "erase") {
            eraseAtPoint(drawingCtx, indexTip);
          }
        } else {
          if (isDrawing && mode === "draw" && currentStroke.length > 1) {
            commitStroke(drawingCtx, currentStroke);
          }
          if (isDrawing) setIsDrawing(false);
          if (currentStroke.length > 0) setCurrentStroke([]);
        }

        // --- Gesture Action Logic (now works correctly) ---
        const now = Date.now();
        const gestureChanged = currentGesture !== lastGestureRef.current;
        const isCoolingDown = now < lastActionTimeRef.current + 1000;

        if (gestureChanged && !isCoolingDown) {
          switch (currentGesture) {
            case "FIST":
              onClear();
              lastActionTimeRef.current = now;
              break;
            case "OPEN_HAND":
              onAnalyze();
              lastActionTimeRef.current = now;
              break;
          }
        }
        lastGestureRef.current = currentGesture;
      } else {
        // No hand detected
        if (isDrawing && mode === "draw" && currentStroke.length > 1) {
          commitStroke(drawingCtx, currentStroke);
        }
        if (isDrawing) setIsDrawing(false);
        if (currentStroke.length > 0) setCurrentStroke([]);
        lastGestureRef.current = "NONE";
      }
    },
    [
      mode,
      isDrawing,
      currentStroke,
      drawingCanvasRef,
      interactionCanvasRef,
      onAnalyze,
      onClear,
    ]
  );

  useEffect(() => {
    onResultsRef.current = handleResults;
  });

  // setting up the camera and MediaPipe
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

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
    hands.onResults((results) => onResultsRef.current?.(results));

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          const videoWidth = videoElement.videoWidth;
          const videoHeight = videoElement.videoHeight;
          if (drawingCanvasRef.current) {
            drawingCanvasRef.current.width = videoWidth;
            drawingCanvasRef.current.height = videoHeight;
          }
          if (interactionCanvasRef.current) {
            interactionCanvasRef.current.width = videoWidth;
            interactionCanvasRef.current.height = videoHeight;
          }
        };
        await videoElement.play();

        const sendToMediaPipe = async () => {
          if (!videoElement.paused) {
            await hands.send({ image: videoElement });
          }
          requestAnimationFrame(sendToMediaPipe);
        };
        sendToMediaPipe();
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    startCamera();

    return () => {
      (videoElement.srcObject as MediaStream)
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, [videoRef, drawingCanvasRef, interactionCanvasRef]);
};
