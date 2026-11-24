import { useCallback, useEffect, useRef, useState } from "react";

const pickMime = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
    window.MediaRecorder?.isTypeSupported?.(t)
  ) || "";

// Mic se record karta hai. Stop hone par onDone({ blob, duration }) chalta hai.
// cancel() par kuch nahi bheja jata.
export default function useVoiceRecorder({ maxSeconds = 300, onDone }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop()); // mic band
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw new Error("Your browser does not support voice recording");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // permission maangta hai
    streamRef.current = stream;

    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    cancelledRef.current = false;
    secondsRef.current = 0;
    setSeconds(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const cancelled = cancelledRef.current;
      const duration = secondsRef.current;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || "audio/webm" });
      cleanup();
      if (!cancelled && blob.size > 0 && duration >= 1) doneRef.current?.({ blob, duration });
    };

    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);

    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= maxSeconds && recorderRef.current?.state === "recording")
        recorderRef.current.stop(); // max length par khud send ho jayega
    }, 1000);
  }, [cleanup, maxSeconds]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  // Component hatne par mic band kar do
  useEffect(
    () => () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    },
    []
  );

  return { recording, seconds, start, stop, cancel };
}
