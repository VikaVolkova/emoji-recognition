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
