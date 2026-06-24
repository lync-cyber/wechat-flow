import type { JobState } from "./types.ts";

export function mapBullmqState(bullmqState: string): JobState {
  switch (bullmqState) {
    case "active":
      return "running";
    case "completed":
      return "succeeded";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
