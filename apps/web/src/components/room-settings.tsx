"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Input,
  getThemeVars,
} from "@together/ui";
import type { RoomSettings } from "@together/shared";
import { QUALITY_OPTIONS, THEME_PRESETS } from "@together/shared";
import type { UserPreferences } from "@/hooks/use-user-preferences";
import { PlaybackVolumeControl } from "@/components/playback-volume-control";
import { X } from "lucide-react";

interface SettingsDrawerProps {
  roomSettings: RoomSettings;
  roomTitle: string;
  userPrefs: UserPreferences;
  isHost: boolean;
  canEditLoop: boolean;
  hasOwner: boolean;
  onRoomUpdate: (settings: Partial<RoomSettings>) => void;
  onRoomTitleUpdate: (title: string) => void;
  onUserPrefsUpdate: (prefs: Partial<UserPreferences>) => void;
  onClose: () => void;
  onClaim?: () => void;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </h3>
  );
}

export function SettingsDrawer({
  roomSettings,
  roomTitle,
  userPrefs,
  isHost,
  canEditLoop,
  hasOwner,
  onRoomUpdate,
  onRoomTitleUpdate,
  onUserPrefsUpdate,
  onClose,
  onClaim,
}: SettingsDrawerProps) {
  const [titleDraft, setTitleDraft] = useState(roomTitle);

  useEffect(() => {
    setTitleDraft(roomTitle);
  }, [roomTitle]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-[var(--bg)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close settings">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <SectionTitle>Your view</SectionTitle>
            <p className="text-xs text-[var(--text-muted)]">
              Personal preferences — only affects this browser.
            </p>

            <SettingRow label="Audio only mode" description="Hide the video player, audio only.">
              <Switch
                aria-label="Audio only mode"
                checked={userPrefs.audioOnly}
                onCheckedChange={(v) => onUserPrefsUpdate({ audioOnly: v })}
              />
            </SettingRow>

            <div>
              <Label className="mb-2 block">Theme</Label>
              <Select
                value={userPrefs.theme}
                onValueChange={(theme) =>
                  onUserPrefsUpdate({ theme: theme as UserPreferences["theme"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Quality</Label>
              <Select
                value={userPrefs.quality}
                onValueChange={(q) =>
                  onUserPrefsUpdate({ quality: q as UserPreferences["quality"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Volume</Label>
              <PlaybackVolumeControl
                volume={userPrefs.volume}
                muted={userPrefs.muted}
                onVolumeChange={(volume) => onUserPrefsUpdate({ volume })}
                onMutedChange={(muted) => onUserPrefsUpdate({ muted })}
              />
            </div>
          </div>

          {isHost && (
            <>
              <div className="space-y-3">
                <SectionTitle>Room</SectionTitle>
                <div>
                  <Label className="mb-2 block">Room name</Label>
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={() => onRoomTitleUpdate(titleDraft)}
                    placeholder="My listening room"
                    maxLength={64}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Privacy</Label>
                  <Select
                    value={roomSettings.privacy}
                    onValueChange={(p) =>
                      onRoomUpdate({ privacy: p as RoomSettings["privacy"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="private">Private (password)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <SectionTitle>Playback controls</SectionTitle>
                <SettingRow
                  label="Lock playback controls"
                  description="Only host and co-hosts can play, pause, or skip."
                >
                  <Switch
                    checked={roomSettings.controlsLocked}
                    onCheckedChange={(v) => onRoomUpdate({ controlsLocked: v })}
                  />
                </SettingRow>
              </div>

              <div className="space-y-3">
                <SectionTitle>Queue</SectionTitle>
                <SettingRow
                  label="Collaborative queue"
                  description="Let everyone add requests, not just hosts."
                >
                  <Switch
                    checked={roomSettings.collaborativeQueue}
                    onCheckedChange={(v) => onRoomUpdate({ collaborativeQueue: v })}
                  />
                </SettingRow>
                <SettingRow
                  label="Auto-promote requests"
                  description="When the queue is empty, play new requests immediately."
                >
                  <Switch
                    checked={roomSettings.autoPromoteRequests}
                    onCheckedChange={(v) => onRoomUpdate({ autoPromoteRequests: v })}
                  />
                </SettingRow>
                <SettingRow
                  label="Democratic promote"
                  description="Requests move to queue after enough votes."
                >
                  <Switch
                    aria-label="Democratic promote"
                    checked={roomSettings.democraticPromote}
                    onCheckedChange={(v) => onRoomUpdate({ democraticPromote: v })}
                  />
                </SettingRow>
                <div>
                  <Label className="mb-2 block">
                    Skip threshold ({Math.round(roomSettings.skipThreshold * 100)}%)
                  </Label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.01"
                    value={roomSettings.skipThreshold}
                    onChange={(e) =>
                      onRoomUpdate({ skipThreshold: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <SectionTitle>Chat</SectionTitle>
                <div>
                  <Label className="mb-2 block">Slow mode (seconds)</Label>
                  <Select
                    value={String(roomSettings.slowModeSeconds)}
                    onValueChange={(v) => onRoomUpdate({ slowModeSeconds: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 3, 5, 10, 30].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s === 0 ? "Off" : `${s}s`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SettingRow
                  label="Profanity filter"
                  description="Replace common bad words in chat."
                >
                  <Switch
                    checked={roomSettings.profanityFilter}
                    onCheckedChange={(v) => onRoomUpdate({ profanityFilter: v })}
                  />
                </SettingRow>
              </div>

              {!hasOwner && onClaim && (
                <Button variant="secondary" className="w-full" onClick={onClaim}>
                  Sign in to save room settings
                </Button>
              )}
            </>
          )}

          {canEditLoop && (
            <div className="space-y-3">
              <SectionTitle>Playback</SectionTitle>
              <div>
                <Label className="mb-2 block">Loop mode</Label>
                <Select
                  value={roomSettings.loopMode}
                  onValueChange={(v) =>
                    onRoomUpdate({ loopMode: v as RoomSettings["loopMode"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="track">Repeat current track</SelectItem>
                    <SelectItem value="queue">Repeat queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function applyUserTheme(theme: UserPreferences["theme"]) {
  const vars = getThemeVars(theme);
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}
