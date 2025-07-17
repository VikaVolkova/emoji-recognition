import type { Landmark } from "@mediapipe/hands";

// Checks if the user is making the "pointing" gesture.
// This is true if the index finger is extended and other fingers are curled.

export const isIndexFingerUp = (landmarks: Landmark[]): boolean => {
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
};

export function isFist(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) {
    return false;
  }

  const indexTipY = landmarks[8].y;
  const indexMcpY = landmarks[5].y;

  const middleTipY = landmarks[12].y;
  const middleMcpY = landmarks[9].y;

  const ringTipY = landmarks[16].y;
  const ringMcpY = landmarks[13].y;

  const pinkyTipY = landmarks[20].y;
  const pinkyMcpY = landmarks[17].y;

  const isFist =
    indexTipY > indexMcpY &&
    middleTipY > middleMcpY &&
    ringTipY > ringMcpY &&
    pinkyTipY > pinkyMcpY;

  return isFist;
}

export function isOpenHand(landmarks: Landmark[]): boolean {
  if (landmarks.length < 21) {
    return false;
  }

  const margin = 0.02;

  const isIndexExtended = landmarks[8].y < landmarks[6].y - margin;
  const isMiddleExtended = landmarks[12].y < landmarks[10].y - margin;
  const isRingExtended = landmarks[16].y < landmarks[14].y - margin;
  const isPinkyExtended = landmarks[20].y < landmarks[18].y - margin;

  const isThumbExtended = landmarks[4].x < landmarks[3].x;

  const isHandOpen =
    isIndexExtended &&
    isMiddleExtended &&
    isRingExtended &&
    isPinkyExtended &&
    isThumbExtended;

  return isHandOpen;
}

export type Gesture = "FIST" | "OPEN_HAND" | "INDEX_FINGER_UP" | "NONE";

export function detectGesture(landmarks: Landmark[]): Gesture {
  if (isFist(landmarks)) {
    return "FIST";
  }
  if (isOpenHand(landmarks)) {
    return "OPEN_HAND";
  }
  if (isIndexFingerUp(landmarks)) {
    return "INDEX_FINGER_UP";
  }

  return "NONE";
}
