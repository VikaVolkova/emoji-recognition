import * as tf from "@tensorflow/tfjs";
import { preProcessCanvas } from "./preProcessCanvas";
import bowIcon from "../assets/bow.png";
import heartIcon from "../assets/heart.png";
import mountainIcon from "../assets/mountain.png";
import ramenIcon from "../assets/ramen.png";

const EMOJI_CLASSES = ["bow", "heart", "mountain", "ramen"];

const iconMap: Record<string, string> = {
  bow: bowIcon,
  heart: heartIcon,
  mountain: mountainIcon,
  ramen: ramenIcon,
};

export const predictDrawing = async (
  model: tf.LayersModel,
  canvas: HTMLCanvasElement
) => {
  const tensor = preProcessCanvas(canvas);
  const prediction = model.predict(tensor) as tf.Tensor;

  const probabilities = await prediction.data();
  const maxProbIndex = (await prediction.argMax(-1).data())[0];

  tensor.dispose();
  prediction.dispose();

  const predictedClass = EMOJI_CLASSES[maxProbIndex];
  const confidence = probabilities[maxProbIndex];

  return {
    text: `I see a ${predictedClass}! (Confidence: ${Math.round(
      confidence * 100
    )}%)`,
    icon: iconMap[predictedClass],
  };
};
