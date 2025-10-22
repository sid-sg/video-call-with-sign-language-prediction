export interface WSmessage {
  type: "join" | "offer" | "answer" | "iceCandidate";
  candidate?: RTCIceCandidateInit;
  sdp?: string;
  from?: string;
  to?: string;
}
