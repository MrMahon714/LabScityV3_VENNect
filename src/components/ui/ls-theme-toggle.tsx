"use client";

import { useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

export function LSThemeToggle() {
  const { setColorScheme } = useMantineColorScheme({ keepTransitions: true });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [animate, setAnimate] = useState<"to-dark" | "to-light" | null>(null);

  const toggle = () => {
    const isDark =
      document.documentElement.getAttribute("data-mantine-color-scheme") === "dark";
    flushSync(() => setAnimate(isDark ? "to-light" : "to-dark"));
    const applyScheme = () => setColorScheme(isDark ? "light" : "dark");
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (doc.startViewTransition && !reduceMotion) {
      const button = buttonRef.current;
      button?.style.setProperty("view-transition-name", "theme-toggle");
      doc
        .startViewTransition(() => flushSync(applyScheme))
        .finished.finally(() => button?.style.removeProperty("view-transition-name"));
    } else {
      applyScheme();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      aria-label="Toggle dark mode"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#C1C9D1",
        padding: 0,
      }}
    >
      <div
        className="ls-theme-toggle-ring"
        data-animate={animate ?? undefined}
        style={{
          position: "absolute",
          width: 20,
          height: 72,
          top: "50%",
          left: "50%",
          marginTop: -10,
          marginLeft: -10,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <IconSun size={20} />
        <IconMoon size={20} style={{ transform: "rotate(30deg)" }} />
      </div>
    </button>
  );
}
