import type { Landmark } from "@mediapipe/hands";

export const isIndexFingerUp = (landmarks: Landmark[]): boolean => {
  if (landmarks.length < 21) {
    return false;
  }

  const margin = 0.02;

  const indexTipY = landmarks[8].y;
  const indexPipY = landmarks[6].y;

  const middleTipY = landmarks[12].y;
  const middlePipY = landmarks[10].y;

  const ringTipY = landmarks[16].y;
  const ringPipY = landmarks[14].y;

  const pinkyTipY = landmarks[20].y;
  const pinkyPipY = landmarks[18].y;

  const isIndexUp = indexTipY < indexPipY - margin;

  const areOthersDown =
    middleTipY > middlePipY && ringTipY > ringPipY && pinkyTipY > pinkyPipY;

  return isIndexUp && areOthersDown;
};

const getDistance = (p1: Landmark, p2: Landmark): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const isFist = (landmarks: Landmark[]): boolean => {
  const thumbTip = landmarks[4];
  const indexPip = landmarks[6];
  const middlePip = landmarks[10];
  const ringPip = landmarks[14];
  const pinkyPip = landmarks[18];

  const fingersCurled =
    landmarks[8].y > indexPip.y &&
    landmarks[12].y > middlePip.y &&
    landmarks[16].y > ringPip.y &&
    landmarks[20].y > pinkyPip.y;

  const thumbOverFingers =
    getDistance(thumbTip, middlePip) < 0.1 ||
    getDistance(thumbTip, ringPip) < 0.1;

  return fingersCurled && thumbOverFingers;
};

const isOpenHand = (landmarks: Landmark[]): boolean => {
  const margin = 0.02;
  const isOpen =
    landmarks[8].y < landmarks[6].y - margin &&
    landmarks[12].y < landmarks[10].y - margin &&
    landmarks[16].y < landmarks[14].y - margin &&
    landmarks[20].y < landmarks[18].y - margin;

  return isOpen;
};

export type Gesture = "FIST" | "OPEN_HAND" | "INDEX_FINGER_UP" | "NONE";

export const detectGesture = (landmarks: Landmark[]): Gesture => {
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
};
