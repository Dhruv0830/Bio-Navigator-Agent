"use client";
import React from "react";

interface LogoIconProps {
  className?: string;
  size?: number;
}

export default function LogoIcon({
  className = "text-[#00E599]",
  size = 24,
}: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Nodes & Connecting Edges */}
      <circle cx="256" cy="70" r="32" />
      <circle cx="415" cy="162" r="32" />
      <circle cx="415" cy="350" r="32" />
      <circle cx="256" cy="442" r="32" />
      <circle cx="97" cy="350" r="32" />
      <circle cx="97" cy="162" r="32" />

      {/* Central Node */}
      <circle cx="256" cy="256" r="48" />

      {/* Edges */}
      <line
        x1="256"
        y1="70"
        x2="415"
        y2="162"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="415"
        y1="162"
        x2="415"
        y2="350"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="415"
        y1="350"
        x2="256"
        y2="442"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="256"
        y1="442"
        x2="97"
        y2="350"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="97"
        y1="350"
        x2="97"
        y2="162"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="97"
        y1="162"
        x2="256"
        y2="70"
        stroke="currentColor"
        strokeWidth="20"
      />
      <line
        x1="256"
        y1="256"
        x2="415"
        y2="162"
        stroke="currentColor"
        strokeWidth="20"
      />
    </svg>
  );
}
