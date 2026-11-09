/**
 * Liquid glass (after 21st.dev's liquid-glass, drawn in plain CSS: .lg-* in app/globals.css). The backdrop is blurred
 * and bent by an SVG displacement filter (#glass-distortion), under a light tint and a bright inner edge; on hover the
 * surface swells with a springy ease. Browsers that can't bend a backdrop (Safari, Firefox) keep the plain blur.
 */
import type { ReactNode } from "react";

/** The bending filter, once per page (an SVG kept out of layout: a display:none one switches its filters off). */
export function GlassFilter() {
  return (
    <svg className="lg-filter" aria-hidden="true" focusable="false">
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
        <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** A liquid-glass surface: its layers, then the content on top. */
export default function LiquidGlass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`lg ${className}`}>
      <span className="lg-warp" aria-hidden="true" />
      <span className="lg-tint" aria-hidden="true" />
      <span className="lg-edge" aria-hidden="true" />
      <div className="lg-body">{children}</div>
    </div>
  );
}
