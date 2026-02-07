/**
 * Analytics Context Module
 *
 * Auto-captures context about acquisition + session behavior for lead forms.
 * Persists first-touch UTMs/referrer and tracks session page sequence.
 */

// ============================================================
// Types
// ============================================================

export interface UTMParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  wbraid: string | null;
  gbraid: string | null;
}

export interface Attribution {
  channel: "paid_search" | "organic_search" | "direct" | "referral" | "social" | "email" | "unknown";
  channelDetail: string;
}

export interface FirstTouch {
  firstPageUrl: string;
  firstPagePath: string;
  firstReferrer: string;
  firstSeenAt: string;
}

export interface SessionData {
  sessionStartAt: string;
  secondsToSubmit: number;
  pagesViewedCount: number;
  pagesViewed: string[];
  firstTouch: FirstTouch;
}

export interface DeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop";
  viewport: { width: number; height: number };
  language: string;
  timeZone: string;
}

export interface PrivacyFlags {
  trackingConsent: boolean | "unknown";
  doNotTrack: boolean;
}

export interface LeadContext {
  leadId: string;
  submittedAt: string;
  siteHost: string;
  pageUrl: string;
  pagePath: string;
  pageTitle: string;
  referrer: string;
  userAgent: string;
  utm: UTMParams;
  attribution: Attribution;
  session: SessionData;
  device: DeviceInfo;
  privacy: PrivacyFlags;
}

export interface LeadPayloadV2 {
  schemaVersion: "lead.v2";
  lead: Record<string, unknown>;
  context: LeadContext;
}

// ============================================================
// Constants
// ============================================================

const FIRST_TOUCH_KEY = "arclo_first_touch";
const UTM_STORAGE_KEY = "arclo_utm_params";
const SESSION_DATA_KEY = "arclo_session_data";
const STORAGE_EXPIRY_DAYS = 30;

// Social domains for referrer classification
const SOCIAL_DOMAINS = [
  "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
  "linkedin.com", "pinterest.com", "tiktok.com", "youtube.com",
  "reddit.com", "tumblr.com", "snapchat.com",
];

// Search engine domains for organic classification
const SEARCH_ENGINES = [
  "google.", "bing.com", "yahoo.com", "duckduckgo.com", "baidu.com",
  "yandex.", "ecosia.org", "ask.com",
];

// ============================================================
// Storage Helpers
// ============================================================

function setWithExpiry(key: string, value: unknown): void {
  const item = {
    value,
    expiry: Date.now() + STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // localStorage may be unavailable
  }
}

function getWithExpiry<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value as T;
  } catch {
    return null;
  }
}

function getSessionData<T>(key: string): T | null {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function setSessionData(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable
  }
}

// ============================================================
// UTM Parsing
// ============================================================

function parseUTMFromUrl(): UTMParams {
  if (typeof window === "undefined") {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      wbraid: null,
      gbraid: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
    gclid: params.get("gclid"),
    wbraid: params.get("wbraid"),
    gbraid: params.get("gbraid"),
  };
}

function hasAnyUTM(utm: UTMParams): boolean {
  return !!(
    utm.utmSource ||
    utm.utmMedium ||
    utm.utmCampaign ||
    utm.utmTerm ||
    utm.utmContent ||
    utm.gclid ||
    utm.wbraid ||
    utm.gbraid
  );
}

// ============================================================
// Attribution Classification
// ============================================================

function classifyChannel(utm: UTMParams, referrer: string): Attribution {
  const referrerLower = referrer.toLowerCase();

  // Check for paid search markers
  if (
    utm.gclid ||
    utm.wbraid ||
    utm.gbraid ||
    utm.utmMedium?.toLowerCase() === "cpc" ||
    utm.utmMedium?.toLowerCase() === "ppc" ||
    utm.utmMedium?.toLowerCase() === "paidsearch" ||
    utm.utmMedium?.toLowerCase() === "paid"
  ) {
    const source = utm.utmSource || "google";
    const medium = utm.utmMedium || "cpc";
    return {
      channel: "paid_search",
      channelDetail: `${source} / ${medium}`,
    };
  }

  // Check for email
  if (
    utm.utmMedium?.toLowerCase() === "email" ||
    utm.utmSource?.toLowerCase() === "email" ||
    utm.utmSource?.toLowerCase() === "newsletter"
  ) {
    return {
      channel: "email",
      channelDetail: `${utm.utmSource || "email"} / ${utm.utmMedium || "email"}`,
    };
  }

  // No referrer = direct
  if (!referrer || referrer === "") {
    return {
      channel: "direct",
      channelDetail: "(direct) / (none)",
    };
  }

  // Check for search engines (organic)
  for (const engine of SEARCH_ENGINES) {
    if (referrerLower.includes(engine)) {
      const engineName = engine.replace(".", "").replace("com", "");
      return {
        channel: "organic_search",
        channelDetail: `${engineName} / organic`,
      };
    }
  }

  // Check for social platforms
  for (const social of SOCIAL_DOMAINS) {
    if (referrerLower.includes(social)) {
      const platform = social.split(".")[0];
      return {
        channel: "social",
        channelDetail: `${platform} / social`,
      };
    }
  }

  // Default to referral
  let referralSource = "referral";
  try {
    const url = new URL(referrer);
    referralSource = url.hostname;
  } catch {
    // Invalid URL, use as-is
  }

  return {
    channel: "referral",
    channelDetail: `${referralSource} / referral`,
  };
}

// ============================================================
// Device Detection
// ============================================================

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // Check UA for mobile/tablet indicators
  const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua);
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(ua);

  if (isTabletUA || (width >= 768 && width < 1024)) {
    return "tablet";
  }

  if (isMobileUA || width < 768) {
    return "mobile";
  }

  return "desktop";
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      deviceType: "desktop",
      viewport: { width: 0, height: 0 },
      language: "en-US",
      timeZone: "UTC",
    };
  }

  return {
    deviceType: detectDeviceType(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    language: navigator.language || "en-US",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

// ============================================================
// Privacy Flags
// ============================================================

function getPrivacyFlags(): PrivacyFlags {
  if (typeof navigator === "undefined") {
    return {
      trackingConsent: "unknown",
      doNotTrack: false,
    };
  }

  // Check for DNT header
  const dnt = navigator.doNotTrack === "1" || (navigator as any).msDoNotTrack === "1";

  // Check if we have a consent management system (can be enhanced later)
  // For now, default to "unknown" unless explicitly set
  const consent: boolean | "unknown" = "unknown";

  return {
    trackingConsent: consent,
    doNotTrack: dnt,
  };
}

// ============================================================
// Session Tracking
// ============================================================

interface SessionState {
  sessionStartAt: string;
  pagesViewed: string[];
}

function getOrInitSession(): SessionState {
  const existing = getSessionData<SessionState>(SESSION_DATA_KEY);

  if (existing) {
    return existing;
  }

  const newSession: SessionState = {
    sessionStartAt: new Date().toISOString(),
    pagesViewed: [],
  };

  setSessionData(SESSION_DATA_KEY, newSession);
  return newSession;
}

function trackPageView(): void {
  if (typeof window === "undefined") return;

  const session = getOrInitSession();
  const pagePath = window.location.pathname;

  // Only add if different from last page (avoid duplicate tracking)
  if (session.pagesViewed[session.pagesViewed.length - 1] !== pagePath) {
    session.pagesViewed.push(pagePath);

    // Cap at 25 pages
    if (session.pagesViewed.length > 25) {
      session.pagesViewed = session.pagesViewed.slice(-25);
    }

    setSessionData(SESSION_DATA_KEY, session);
  }
}

// ============================================================
// First Touch Tracking
// ============================================================

interface FirstTouchData {
  firstPageUrl: string;
  firstPagePath: string;
  firstReferrer: string;
  firstSeenAt: string;
  utm: UTMParams;
}

function captureFirstTouch(): void {
  if (typeof window === "undefined") return;

  // Only capture if not already stored
  const existing = getWithExpiry<FirstTouchData>(FIRST_TOUCH_KEY);
  if (existing) return;

  const utm = parseUTMFromUrl();

  const firstTouch: FirstTouchData = {
    firstPageUrl: window.location.href,
    firstPagePath: window.location.pathname,
    firstReferrer: document.referrer || "",
    firstSeenAt: new Date().toISOString(),
    utm,
  };

  setWithExpiry(FIRST_TOUCH_KEY, firstTouch);

  // Also store UTM separately if present (for easier access)
  if (hasAnyUTM(utm)) {
    setWithExpiry(UTM_STORAGE_KEY, utm);
  }
}

// ============================================================
// Initialization
// ============================================================

let initialized = false;

/**
 * Initialize analytics context tracking.
 * Call this on app mount and on route changes.
 */
export function initAnalyticsContext(): void {
  if (typeof window === "undefined") return;

  // Capture first touch on first init
  if (!initialized) {
    captureFirstTouch();
    initialized = true;
  }

  // Track current page view
  trackPageView();

  // Check for new UTMs on this page (might be a new campaign click)
  const currentUTM = parseUTMFromUrl();
  if (hasAnyUTM(currentUTM)) {
    // Update stored UTM with latest values
    setWithExpiry(UTM_STORAGE_KEY, currentUTM);
  }
}

// ============================================================
// Get Lead Context
// ============================================================

/**
 * Generate a UUID for the lead.
 */
function generateLeadId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the full lead context to include in form submissions.
 */
export function getLeadContext(): LeadContext {
  // Get stored data
  const firstTouch = getWithExpiry<FirstTouchData>(FIRST_TOUCH_KEY);
  const storedUTM = getWithExpiry<UTMParams>(UTM_STORAGE_KEY);
  const session = getSessionData<SessionState>(SESSION_DATA_KEY) || getOrInitSession();

  // Current page UTMs (prefer these if present, fallback to stored)
  const currentUTM = parseUTMFromUrl();
  const utm: UTMParams = hasAnyUTM(currentUTM)
    ? currentUTM
    : storedUTM || {
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        gclid: null,
        wbraid: null,
        gbraid: null,
      };

  // Calculate seconds to submit
  const sessionStart = new Date(session.sessionStartAt).getTime();
  const now = Date.now();
  const secondsToSubmit = Math.round((now - sessionStart) / 1000);

  // Get last 10 pages viewed
  const pagesViewed = session.pagesViewed.slice(-10);

  // Classification
  const referrer = firstTouch?.firstReferrer || document.referrer || "";
  const attribution = classifyChannel(utm, referrer);

  // Build context
  const context: LeadContext = {
    leadId: generateLeadId(),
    submittedAt: new Date().toISOString(),
    siteHost: typeof window !== "undefined" ? window.location.host : "",
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
    pagePath: typeof window !== "undefined" ? window.location.pathname : "",
    pageTitle: typeof document !== "undefined" ? document.title : "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    utm,
    attribution,
    session: {
      sessionStartAt: session.sessionStartAt,
      secondsToSubmit,
      pagesViewedCount: session.pagesViewed.length,
      pagesViewed,
      firstTouch: {
        firstPageUrl: firstTouch?.firstPageUrl || "",
        firstPagePath: firstTouch?.firstPagePath || "",
        firstReferrer: firstTouch?.firstReferrer || "",
        firstSeenAt: firstTouch?.firstSeenAt || "",
      },
    },
    device: getDeviceInfo(),
    privacy: getPrivacyFlags(),
  };

  return context;
}

/**
 * Build a complete lead payload with schema version.
 */
export function buildLeadPayload(lead: Record<string, unknown>): LeadPayloadV2 {
  return {
    schemaVersion: "lead.v2",
    lead,
    context: getLeadContext(),
  };
}
