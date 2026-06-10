import React from "react";

export default function AppLogo({ size = 48, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="#0f62fe" />
      <path d="M24 14L8 22.5L24 31L40 22.5L24 14Z" fill="white" />
      <path
        d="M17 26.5V34C19 35.8 21.4 37 24 37C26.6 37 29 35.8 31 34V26.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="40" y1="22.5" x2="40" y2="30.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="40" cy="32.5" r="2.2" fill="white" />
    </svg>
  );
}
