import React from "react";

/**
 * White Hero (high-contrast) — matches the approved "clean white" mock.
 * - Clean white surface
 * - Subtle cosmic glow in the background
 * - Reduced copy (no redundant paragraph)
 * - Clear primary vs secondary CTAs
 */
export default function WhiteHero() {
  return (
    <div className="arclo-hero-wrap">
      <div className="arclo-hero-glow" />

      <div className="arclo-hero-container">
        <header className="arclo-nav">
          <div className="arclo-nav-left">
            <a className="arclo-logo" href="/">
              {/* Swap this SVG for your real logo component if you already have one */}
              <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
                <defs>
                  <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#7c3aed" />
                    <stop offset="0.55" stopColor="#ec4899" />
                    <stop offset="1" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <path d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z" fill="url(#g)" />
              </svg>
              <span>Arclo</span>
            </a>
          </div>

          <nav className="arclo-nav-center" aria-label="Primary navigation">
            <a href="/examples">Examples</a>
            <a href="/how-it-works">How It Works</a>
            <a href="/pricing">Pricing</a>
            <a href="/login">Log In</a>
          </nav>

          <div className="arclo-nav-right">
            <a className="arclo-btn arclo-btn-secondary" href="/generate">
              Generate My Site
            </a>
            <a className="arclo-btn arclo-btn-primary" href="/analyze">
              Analyze My Website
            </a>
          </div>
        </header>

        <main className="arclo-hero">
          <h1 className="arclo-h1">
            Autonomous SEO that <br />
            grows <span className="emph">traffic</span> — without guesswork.
          </h1>

          <div className="arclo-sub">Weekly fixes you can approve, apply, and track.</div>

          <div className="arclo-steps" aria-label="How it works steps">
            <div className="step">
              <span className="bullet green" />
              <span>Scan your site</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet purple" />
              <span>Identify what’s holding rankings back</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet orange" />
              <span>Apply fixes week-by-week</span>
            </div>
          </div>

          <div className="arclo-cta">
            <input className="arclo-input" placeholder="Enter your website (example.com)" />
            <button className="arclo-btn arclo-btn-primary arclo-primary-cta">Analyze My Website</button>
          </div>

          <div className="arclo-micro">Free scan • No credit card • Takes ~60 seconds</div>

          <button className="arclo-btn arclo-secondary-cta">Generate a Free Website</button>

          <div className="arclo-pill-row" aria-label="Trust factors">
            <div className="arclo-trust-pill"><span className="dot" /> Built for service businesses</div>
            <div className="arclo-trust-pill"><span className="dot" /> Cancel anytime</div>
            <div className="arclo-trust-pill"><span className="dot" /> Your changes logged</div>
            <div className="arclo-trust-pill"><span className="dot" /> SEO best practices, automated</div>
          </div>

          <div className="arclo-hairline" />
        </main>
      </div>
    </div>
  );
}
