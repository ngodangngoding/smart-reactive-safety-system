"use client";

import dynamic from "next/dynamic";
import { WidgetSkeleton } from "./WidgetCard.jsx";

const GpsMapLazy = dynamic(() => import("./GpsMap.jsx"), { ssr: false, loading: () => <WidgetSkeleton /> });

export default GpsMapLazy;

export function GpsFooter({ lat, lng }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border-faint px-4 py-2.5 text-xs tabular-nums text-text-secondary">
      <span>
        Lat <b className="font-semibold text-foreground">{Number(lat).toFixed(5)}</b>
      </span>
      <span>
        Lng <b className="font-semibold text-foreground">{Number(lng).toFixed(5)}</b>
      </span>
    </div>
  );
}
