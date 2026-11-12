"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

/*file that will render different colors of the logo based on light/dark mode*/
export function LSAuthLogo({
  width,
  height,
  style,
  priority,
}: {
  width: number;
  height: number;
  style?: CSSProperties;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        className="ls-logo-for-light"
        src="/logo.png"
        alt="LabScity Logo"
        width={width}
        height={height}
        priority={priority}
        style={style}
      />
      <Image
        className="ls-logo-for-dark"
        src="/logo-lightgray.png"
        alt="LabScity Logo"
        width={width}
        height={height}
        priority={priority}
        style={style}
      />
    </>
  );
}
