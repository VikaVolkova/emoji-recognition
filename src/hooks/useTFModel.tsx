import { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";

export const useTFModel = (modelUrl: string) => {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedModel = await tf.loadLayersModel(modelUrl);
        setModel(loadedModel);
      } catch (e) {
        console.error("Failed to load model:", e);
        setError("Error: Could not load the AI model.");
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
  }, [modelUrl]);

  return { model, isLoading, error };
};
