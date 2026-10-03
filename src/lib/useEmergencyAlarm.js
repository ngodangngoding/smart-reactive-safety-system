"use client";

import { useEffect, useRef, useState } from "react";

export const ALARM_SRC = "/sounds/emergency-alarm.mp3";

export function useEmergencyAlarm(count) {
  const audioRef = useRef(null);
  const [mutedAt, setMutedAt] = useState(0);
  const [prevCount, setPrevCount] = useState(count);
  if (count !== prevCount) {
    setPrevCount(count);
    if (count === 0) setMutedAt(0);
  }
  const sounding = count > 0 && count > mutedAt;

  useEffect(() => {
    if (sounding) audioRef.current?.play().catch(() => {});
    else audioRef.current?.pause();
  }, [sounding]);

  return { audioRef, sounding, mute: () => setMutedAt(count) };
}
