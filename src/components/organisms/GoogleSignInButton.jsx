"use client";

import { useEffect, useRef } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({ onCredential }) {
  const container = useRef(null);
  const callback = useRef(onCredential);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const render = () => {
      if (cancelled || !container.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (response) => callback.current?.(response.credential),
      });
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      window.google.accounts.id.renderButton(container.current, { theme: dark ? "filled_black" : "outline", size: "large", shape: "rectangular", width: 380, text: "continue_with" });
    };

    let script = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (window.google?.accounts?.id) {
      render();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = GSI_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
    };
  }, []);

  return <div ref={container} className="flex min-h-[44px] w-full justify-center" />;
}
