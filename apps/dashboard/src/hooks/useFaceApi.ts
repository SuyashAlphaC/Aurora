import { useCallback, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";

let modelsPromise: Promise<void> | null = null;

async function loadModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const uri = "/models";
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(uri),
        faceapi.nets.faceLandmark68Net.loadFromUri(uri),
        faceapi.nets.faceRecognitionNet.loadFromUri(uri),
      ]);
    })();
  }
  await modelsPromise;
}

export function useFaceApi() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const init = useCallback(async () => {
    if (ready || loading) return;
    setLoading(true);
    setError(null);
    try {
      await loadModels();
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load face models");
    } finally {
      setLoading(false);
    }
  }, [ready, loading]);

  const startCamera = useCallback(async () => {
    await init();
    if (streamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, [init]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureDescriptor = useCallback(async (): Promise<number[] | null> => {
    await init();
    const video = videoRef.current;
    if (!video) throw new Error("Camera not started");

    const detection = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return Array.from(detection.descriptor);
  }, [init]);

  const captureFromImage = useCallback(async (image: HTMLImageElement): Promise<number[] | null> => {
    await init();
    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  }, [init]);

  return {
    ready,
    loading,
    error,
    videoRef,
    init,
    startCamera,
    stopCamera,
    captureDescriptor,
    captureFromImage,
  };
}
