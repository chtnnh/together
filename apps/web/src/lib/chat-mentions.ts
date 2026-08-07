import type { Participant } from "@together/shared";

/** Participants whose display names match a mention query (for autocomplete). */
export function filterMentionMatches(
  participants: Participant[],
  mentionQuery: string | null,
  limit = 8,
): Participant[] {
  if (mentionQuery === null) return [];
  return participants
    .filter((p) =>
      mentionQuery === "" ? true : p.displayName.toLowerCase().includes(mentionQuery.toLowerCase()),
    )
    .slice(0, limit);
}

/** Parse @mention query at cursor position, or null when not in a mention token. */
export function parseMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]!))) {
    return null;
  }
  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return query;
}

/** Whether the current participant is @mentioned in a message body. */
export function isMentionedByYou(
  body: string,
  currentParticipantId: string | undefined,
  participants: Participant[],
): boolean {
  if (!currentParticipantId) return false;
  const you = participants.find((p) => p.id === currentParticipantId);
  if (!you) return false;
  return body.toLowerCase().includes(`@${you.displayName.toLowerCase()}`);
}

/** Find a participant mention starting at `atIndex` in body, or null. */
export function matchMentionAt(
  body: string,
  atIndex: number,
  participants: Participant[],
): Participant | null {
  if (body[atIndex] !== "@") return null;

  const namesByLength = [...participants]
    .map((p) => p.displayName)
    .sort((a, b) => b.length - a.length);

  for (const name of namesByLength) {
    const candidate = body.slice(atIndex + 1, atIndex + 1 + name.length);
    if (candidate.toLowerCase() !== name.toLowerCase()) continue;
    const next = body[atIndex + 1 + name.length];
    if (next !== undefined && !/[\s.,!?;:)]/.test(next)) continue;
    return participants.find((p) => p.displayName.toLowerCase() === name.toLowerCase()) ?? null;
  }

  return null;
}
