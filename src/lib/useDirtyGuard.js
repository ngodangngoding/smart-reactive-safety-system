"use client";

import { useEffect } from "react";

export function useDirtyGuard(dirty) {
  useEffect(() => {
    window.__saDirty = dirty;
    return () => {
      window.__saDirty = false;
    };
  }, [dirty]);
}
