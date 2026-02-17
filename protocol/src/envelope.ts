import { REEF_VERSION } from "./types.js";
import type { MessageType, ReefEnvelope } from "./types.js";
import { envelopeSchema } from "./validation.js";

/**
 * Encode a Reef message envelope as a JSON string.
 * Auto-sets reef version and timestamp.
 */
export function encodeEnvelope(
  type: MessageType,
  from: string,
  payload: unknown,
): string {
  const envelope: ReefEnvelope = {
    reef: REEF_VERSION,
    type,
    from,
    payload,
    ts: new Date().toISOString(),
  };
  return JSON.stringify(envelope);
}

/**
 * Decode and validate a raw JSON string into a ReefEnvelope.
 * Throws if the message is not valid.
 */
export function decodeEnvelope(raw: string): ReefEnvelope {
  const data = JSON.parse(raw);
  return envelopeSchema.parse(data) as ReefEnvelope;
}
