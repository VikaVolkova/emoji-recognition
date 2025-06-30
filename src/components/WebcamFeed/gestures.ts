import type { Landmark } from "@mediapipe/hands";

// Checks if the user is making the "pointing" gesture.
// This is true if the index finger is extended and other fingers are curled.

export function isIndexFingerUp(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) {
    return false;
  }

  const margin = 0.02;

  // Get the y-coordinates of the finger tips and PIP joints (the middle knuckle)
  // In the screen coordinate system, a lower 'y' value means higher up on the screen.
  const indexTipY = landmarks[8].y;
  const indexPipY = landmarks[6].y;

  const middleTipY = landmarks[12].y;
  const middlePipY = landmarks[10].y;

  const ringTipY = landmarks[16].y;
  const ringPipY = landmarks[14].y;

  const pinkyTipY = landmarks[20].y;
  const pinkyPipY = landmarks[18].y;

  // Rule: Index finger is "up" if its tip is significantly above its PIP joint by a margin.
  const isIndexUp = indexTipY < indexPipY - margin;

  // Rule: Other fingers are "down" if their tips are below their PIP joints.
  const areOthersDown =
    middleTipY > middlePipY && ringTipY > ringPipY && pinkyTipY > pinkyPipY;

  return isIndexUp && areOthersDown;
}
