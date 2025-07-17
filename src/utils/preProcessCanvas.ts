import * as tf from "@tensorflow/tfjs";

export const preProcessCanvas = (canvas: HTMLCanvasElement): tf.Tensor => {
  // Find bounding box of the drawing
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width,
    minY = canvas.height,
    maxX = -1,
    maxY = -1;

  // Loop through all pixels to find the bounds of the drawing
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      // Check if the pixel is not black (alpha > 0 and color > 0)
      if (
        data[i + 3] > 0 &&
        (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10)
      ) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX === -1) {
    // Handle empty canvas
    return tf.zeros([1, 192, 192, 3]);
  }

  // Crop the image data based on the bounding box
  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;

  // Create a new offscreen canvas to draw the cropped and resized image
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = 192;
  offscreenCanvas.height = 192;
  const offscreenCtx = offscreenCanvas.getContext("2d")!;

  // Fill with black background
  offscreenCtx.fillStyle = "black";
  offscreenCtx.fillRect(0, 0, 192, 192);

  // Calculate new dimensions to preserve aspect ratio
  let newWidth, newHeight;
  if (contentWidth > contentHeight) {
    newWidth = 192;
    newHeight = Math.floor(192 * (contentHeight / contentWidth));
  } else {
    newHeight = 192;
    newWidth = Math.floor(192 * (contentWidth / contentHeight));
  }

  // Calculate padding to center the image
  const topPad = Math.floor((192 - newHeight) / 2);
  const leftPad = Math.floor((192 - newWidth) / 2);

  // Draw the cropped content onto the offscreen canvas, resizing and padding it
  offscreenCtx.drawImage(
    canvas,
    minX,
    minY,
    contentWidth,
    contentHeight, // Source rectangle (crop)
    leftPad,
    topPad,
    newWidth,
    newHeight // Destination rectangle (resize and pad)
  );

  // Convert the final 192x192 canvas to a tensor
  return tf.tidy(() => {
    let tensor = tf.browser.fromPixels(offscreenCanvas);
    tensor = tensor.expandDims(0); // Add batch dimension
    tensor = tensor.toFloat().div(255.0); // Normalize to [0, 1]
    return tensor;
  });
};
