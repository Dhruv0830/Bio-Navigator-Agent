"use client";
import React, { useEffect, useState } from "react";

export default function GermCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement;
      if (target) {
        const computedCursor = window.getComputedStyle(target).cursor;
        setIsPointer(
          computedCursor === "pointer" ||
            target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.closest("button") !== null ||
            target.closest("a") !== null,
        );
      }
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-[99999] transition-transform duration-100 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) ${
          isClicked
            ? "scale(0.7)"
            : isPointer
              ? "scale(1.3) rotate(20deg)"
              : "scale(1)"
        }`,
      }}
    >
      {/* Germ / Pathogen Custom Cursor */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] animate-spin-slow"
      >
        <line
          x1="50"
          y1="8"
          x2="50"
          y2="24"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="76"
          x2="50"
          y2="92"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="50"
          x2="24"
          y2="50"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="76"
          y1="50"
          x2="92"
          y2="50"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="20"
          x2="32"
          y2="32"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="68"
          y1="68"
          x2="80"
          y2="80"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="80"
          y1="20"
          x2="68"
          y2="32"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="80"
          x2="32"
          y2="68"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="#0a0a0a"
          stroke="white"
          strokeWidth="6"
        />
        <circle cx="40" cy="40" r="7" fill="white" opacity="0.9" />
        <circle cx="62" cy="54" r="5" fill="white" opacity="0.7" />
        <circle cx="48" cy="64" r="3.5" fill="white" opacity="0.6" />
      </svg>
    </div>
  );
}
