"use client";

import { VolumeX } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import { useEmergencyAlarm, ALARM_SRC } from "@/lib/useEmergencyAlarm.js";

export default function EmergencyAlarm({ count }) {
  const { audioRef, sounding, mute } = useEmergencyAlarm(count);

  return (
    <>
      <audio ref={audioRef} src={ALARM_SRC} loop preload="auto" />
      {sounding && (
        <Button
          variant="danger"
          onClick={mute}
          className="fixed bottom-5 right-5 z-[2100] animate-pulse rounded-full px-4 py-3 shadow-overlay"
        >
          <VolumeX className="h-4 w-4" aria-hidden="true" />
          Turn off alarm
        </Button>
      )}
    </>
  );
}
