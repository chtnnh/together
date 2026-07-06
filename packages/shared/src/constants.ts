export const APP_NAME = "Together";

export const MAX_DISPLAY_NAME_LENGTH = 24;
export const MAX_QUEUE_LENGTH = 100;
export const MAX_REQUESTS_PER_USER = 5;
export const CHAT_BUFFER_SIZE = 100;
export const HISTORY_BUFFER_SIZE = 50;
export const SYNC_DRIFT_THRESHOLD_MS = 300;
export const SYNC_CHECK_INTERVAL_MS = 1000;
export const PASSWORD_LOCKOUT_ATTEMPTS = 5;
export const PASSWORD_LOCKOUT_MINUTES = 15;
export const RESOLUTION_AUTO_QUEUE_THRESHOLD = 85;
export const RESOLUTION_PROMPT_THRESHOLD = 50;
export const DURATION_TOLERANCE_MS = 5000;
export const RESOLUTION_CACHE_TTL_DAYS = 30;

export const THEME_PRESETS = [
  "midnight",
  "ocean",
  "sunset",
  "forest",
  "lavender",
  "high-contrast",
] as const;

/** Default accent color per theme preset */
export const THEME_ACCENTS: Record<(typeof THEME_PRESETS)[number], string> = {
  midnight: "#6366f1",
  ocean: "#0ea5e9",
  sunset: "#f97316",
  forest: "#22c55e",
  lavender: "#a78bfa",
  "high-contrast": "#facc15",
};

export const QUALITY_OPTIONS = ["auto", "max", "1080p", "720p", "480p", "144p"] as const;

export const PRIVACY_LEVELS = ["public", "unlisted", "private"] as const;

export const TRACK_SOURCES = ["youtube", "spotify", "apple", "manual"] as const;

export const RESOLVER_STATUSES = [
  "pending",
  "resolving",
  "resolved",
  "needs_pick",
] as const;

export const PARTICIPANT_ROLES = ["host", "co-host", "guest"] as const;

export const SKIP_VOTE_PRESETS = {
  half: 0.5,
  majority: 0.51,
  supermajority: 0.66,
} as const;

export const PROFANITY_WORDS = [
  "damn",
  "hell",
  "shit",
  "fuck",
  "ass",
  "bitch",
];
