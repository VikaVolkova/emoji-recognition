import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS, type NormalizedLandmark } from "@mediapipe/hands";

export type Point = { x: number; y: number };

const ERASE_RADIUS = 25;

export const clearCanvas = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export const drawHand = (
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[]
) => {
  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);

  drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
    color: "#00FF00",
    lineWidth: 5,
  });
  drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });

  ctx.restore();
};

export const commitStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: Point[]
) => {
  if (stroke.length < 2) return;

  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "#56DFCF";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(stroke[0].x * ctx.canvas.width, stroke[0].y * ctx.canvas.height);
  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i].x * ctx.canvas.width, stroke[i].y * ctx.canvas.height);
  }
  ctx.stroke();
  ctx.restore();
};

export const eraseAtPoint = (ctx: CanvasRenderingContext2D, point: Point) => {
  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);

  // 'destination-out' operation erases existing content
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(
    point.x * ctx.canvas.width,
    point.y * ctx.canvas.height,
    ERASE_RADIUS,
    0,
    2 * Math.PI
  );
  ctx.fill();
  ctx.restore();
};

export const checkIsCanvasEmpty = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    console.error("Could not get canvas context for checking if empty.");
    return true;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      return false;
    }
  }

  return true;
};

export const drawPreviewStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: Point[]
) => {
  if (stroke.length < 2) return;

  ctx.save();
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1); // Flip to match camera

  ctx.strokeStyle = "#898AC4"; // A distinct "preview" color
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(stroke[0].x * ctx.canvas.width, stroke[0].y * ctx.canvas.height);
  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i].x * ctx.canvas.width, stroke[i].y * ctx.canvas.height);
  }
  ctx.stroke();
  ctx.restore();
};
