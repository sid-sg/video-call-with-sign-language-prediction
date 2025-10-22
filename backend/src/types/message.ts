export interface WSmessage {
  type: "join" | "offer" | "answer" | "iceCandidate" | "chat";
  candidate?: RTCIceCandidateInit;
  sdp?: string;
  from?: string;
  to?: string;
  message?: string;
  timestamp?: number;
}
