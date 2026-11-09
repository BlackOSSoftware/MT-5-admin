"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "default" | "pointer" | "text";

const POINTER_SELECTOR =
  "a, button, [role='button'], [role='link'], [role='menuitem'], label, summary, select, input[type='checkbox'], input[type='radio'], input[type='range'], input[type='submit'], input[type='button'], [data-cursor='pointer']";

const TEXT_SELECTOR =
  "input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file']):not([type='color']):not([type='button']):not([type='submit']), textarea, [contenteditable='true']";

/**
 * Custom cursor for the admin panel — visible on both light & dark themes.
 * Only active on fine-pointer devices (mouse/trackpad); touch devices keep native.
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    setEnabled(true);
    document.documentElement.classList.add("custom-cursor-enabled");

    let raf = 0;
    let x = -100;
    let y = -100;

    const applyVariant = (v: Variant) => {
      if (ref.current) ref.current.dataset.variant = v;
    };

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (ref.current) {
            ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          }
        });
      }

      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") {
        applyVariant("default");
        return;
      }
      if (target.closest(TEXT_SELECTOR)) {
        applyVariant("text");
      } else if (target.closest(POINTER_SELECTOR)) {
        applyVariant("pointer");
      } else {
        applyVariant("default");
      }
    };

    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (ref.current) ref.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("custom-cursor-enabled");
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div ref={ref} className="custom-cursor" data-variant="default" aria-hidden="true">
      {/* Default arrow */}
      <svg
        className="custom-cursor__icon custom-cursor__icon--default"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="M4 2 L4 15 L8 11.5 L10.5 17 L13 15.8 L10.6 10.6 L16 10.2 Z"
          fill="#0b1320"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>

      {/* Pointer hand */}
      <svg
        className="custom-cursor__icon custom-cursor__icon--pointer"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M9 11.5V5.8a1.8 1.8 0 0 1 3.6 0v4.7M12.6 10.3V4.6a1.8 1.8 0 0 1 3.6 0v6.2M16.2 10.8V6.4a1.8 1.8 0 0 1 3.6 0v8.1c0 4.2-3.1 7.5-7.3 7.5-2.6 0-4.4-1-5.9-3.1l-2.6-3.6a1.8 1.8 0 0 1 2.9-2.1l1.6 2.2"
          fill="#0b1320"
          stroke="#ffffff"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Text I-beam */}
      <svg
        className="custom-cursor__icon custom-cursor__icon--text"
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
      >
        <path
          d="M7 3v16M15 3v16M4 8h6M12 8h6M4 14h6M12 14h6"
          stroke="#0b1320"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M7 3v16M15 3v16M4 8h6M12 8h6M4 14h6M12 14h6"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeLinecap="round"
          transform="translate(0.6 0.6)"
        />
      </svg>
    </div>
  );
}
