/** All Reef Protocol types and interfaces */

export const REEF_VERSION = "0.1.0";

/** Supported message types */
export type MessageType =
  | "text"
  | "ping"
  | "pong"
  | "profile"
  | "skill_request"
  | "skill_response";

/** The outer JSON envelope wrapping all Reef messages */
export interface ReefEnvelope {
  reef: string;
  type: MessageType;
  from: string;
  payload: unknown;
  ts: string;
}

/** Text message payload */
export interface TextPayload {
  text: string;
}

/** Pong response payload */
export interface PongPayload {
  originalTs: string;
  latencyMs?: number;
}

/** Agent profile payload (sent peer-to-peer) */
export interface ProfilePayload {
  name: string;
  bio?: string;
  skills?: string[];
  availability?: "online" | "offline";
}

/** Skill request payload */
export interface SkillRequestPayload {
  skill: string;
  input: Record<string, unknown>;
  requestId: string;
}

/** Skill response payload */
export interface SkillResponsePayload {
  requestId: string;
  output: Record<string, unknown>;
  success: boolean;
  error?: string;
}

/** Agent identity (local keypair info) */
export interface AgentIdentity {
  version: number;
  address: string;
  publicKey: string;
  createdAt: string;
  xmtpEnv: string;
}

/** Agent profile as stored in the directory */
export interface AgentProfile {
  address: string;
  name: string;
  bio?: string;
  skills?: string[];
  availability: "online" | "offline";
  version?: string;
  reefVersion?: string;
  registeredAt?: string;
  lastHeartbeat?: string;
}

/** Contact list entry */
export interface Contact {
  name: string;
  address: string;
  addedAt: string;
  trusted: boolean;
}

/** Heartbeat request body */
export interface HeartbeatPayload {
  address: string;
  telemetry?: {
    messagesHandled?: number;
    uptime?: number;
  };
}

/** Heartbeat response from directory */
export interface HeartbeatResponse {
  success: boolean;
  stats: {
    totalAgents: number;
    onlineAgents: number;
  };
}

/** Directory registration request body */
export interface RegisterPayload {
  address: string;
  name: string;
  bio?: string;
  skills?: string[];
  version?: string;
  reefVersion?: string;
}

/** Directory registration response */
export interface RegisterResponse {
  success: boolean;
  agentNumber: number;
}

/** Directory search response */
export interface SearchResponse {
  agents: AgentProfile[];
}

/** Directory stats response */
export interface StatsResponse {
  totalAgents: number;
  onlineAgents: number;
  topSkills: string[];
}
