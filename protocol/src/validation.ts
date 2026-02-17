import { z } from "zod";

/** Valid message types */
export const messageTypeSchema = z.enum([
  "text",
  "ping",
  "pong",
  "profile",
  "skill_request",
  "skill_response",
]);

/** Reef envelope schema */
export const envelopeSchema = z.object({
  reef: z.string(),
  type: messageTypeSchema,
  from: z.string().min(1),
  payload: z.unknown(),
  ts: z.string(),
});

/** Text payload schema */
export const textPayloadSchema = z.object({
  text: z.string().min(1),
});

/** Pong payload schema */
export const pongPayloadSchema = z.object({
  originalTs: z.string(),
  latencyMs: z.number().optional(),
});

/** Profile payload schema */
export const profilePayloadSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  availability: z.enum(["online", "offline"]).optional(),
});

/** Skill request payload schema */
export const skillRequestPayloadSchema = z.object({
  skill: z.string().min(1),
  input: z.record(z.unknown()),
  requestId: z.string().min(1),
});

/** Skill response payload schema */
export const skillResponsePayloadSchema = z.object({
  requestId: z.string().min(1),
  output: z.record(z.unknown()),
  success: z.boolean(),
  error: z.string().optional(),
});

/** Agent profile schema (for directory registration) */
export const registerPayloadSchema = z.object({
  address: z.string().min(1),
  name: z.string().min(1).max(128),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  version: z.string().optional(),
  reefVersion: z.string().optional(),
});

/** Heartbeat request schema */
export const heartbeatPayloadSchema = z.object({
  address: z.string().min(1),
  telemetry: z
    .object({
      messagesHandled: z.number().optional(),
      uptime: z.number().optional(),
    })
    .optional(),
});

/** Contact schema */
export const contactSchema = z.object({
  name: z.string(),
  address: z.string().min(1),
  addedAt: z.string(),
  trusted: z.boolean(),
});

/**
 * Validate an envelope — returns typed result or throws.
 */
export function validateEnvelope(data: unknown) {
  return envelopeSchema.parse(data);
}

/**
 * Validate an agent profile for directory registration.
 */
export function validateProfile(data: unknown) {
  return registerPayloadSchema.parse(data);
}
