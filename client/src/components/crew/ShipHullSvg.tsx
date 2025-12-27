import React from "react";

export function ShipHullSvg({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 560"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hullFill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
        <linearGradient id="hullStroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
        <radialGradient id="hullGlow" cx="0.25" cy="0.15" r="0.9">
          <stop offset="0" stopColor="rgba(245,158,11,0.14)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.06)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <path
        d="M110,80 C180,30 300,10 500,10 C700,10 820,30 890,80
           C945,120 980,175 980,280
           C980,385 945,440 890,480
           C820,530 700,550 500,550
           C300,550 180,530 110,480
           C55,440 20,385 20,280
           C20,175 55,120 110,80 Z"
        fill="url(#hullFill)"
        stroke="url(#hullStroke)"
        strokeWidth="2"
      />

      <path
        d="M110,80 C180,30 300,10 500,10 C700,10 820,30 890,80
           C945,120 980,175 980,280
           C980,385 945,440 890,480
           C820,530 700,550 500,550
           C300,550 180,530 110,480
           C55,440 20,385 20,280
           C20,175 55,120 110,80 Z"
        fill="url(#hullGlow)"
        opacity="0.9"
      />

      <path
        d="M380,80 C420,55 465,45 500,45 C535,45 580,55 620,80
           C610,120 575,145 500,145 C425,145 390,120 380,80 Z"
        fill="rgba(255,255,255,0.07)"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.5"
      />

      <path
        d="M150,160 C260,110 350,95 500,95 C650,95 740,110 850,160"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      <path
        d="M110,280 C260,250 380,240 500,240 C620,240 740,250 890,280"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
      />
      <path
        d="M150,400 C270,440 365,455 500,455 C635,455 730,440 850,400"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
      />

      <path
        d="M360,520 C410,540 450,550 500,550 C550,550 590,540 640,520
           C610,510 565,505 500,505 C435,505 390,510 360,520 Z"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />

      <circle cx="475" cy="532" r="4" fill="rgba(56,189,248,0.55)" />
      <circle cx="525" cy="532" r="4" fill="rgba(56,189,248,0.55)" />
    </svg>
  );
}
