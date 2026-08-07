/** Votes required for skip or democratic promote given room size and threshold. */
export function requiredVoteCount(participantCount: number, skipThreshold: number): number {
  return Math.ceil(Math.max(1, participantCount) * skipThreshold);
}
