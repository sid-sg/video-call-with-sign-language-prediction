export interface SignalingMessage {
    type: 'offer' | 'answer' | 'iceCandidate' | 'chat';
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
    message?: string;
    from: string;
    to: string;
    timestamp?: number;
}

export interface MediaControls {
    video: boolean;
    audio: boolean;
}