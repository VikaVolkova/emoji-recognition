export const handleSave = (
  number: number,
  setNumber: (value: React.SetStateAction<number>) => void,
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>
) => {
  const drawingCanvas = drawingCanvasRef.current;
  if (!drawingCanvas) return;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCanvas.width = drawingCanvas.width;
  tempCanvas.height = drawingCanvas.height;

  tempCtx.fillStyle = "none";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  tempCtx.drawImage(drawingCanvas, 0, 0);

  const imageDataUrl = tempCanvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.style.display = "none";
  document.body.appendChild(link);

  link.href = imageDataUrl;
  link.download = `bow-${number}.png`;

  link.click();

  document.body.removeChild(link);
  setNumber((prev: number) => prev + 1);

  console.log("Download initiated!");
};
