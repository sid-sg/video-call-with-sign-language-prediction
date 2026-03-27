import { useState, useCallback, useRef, useEffect } from 'react';

interface UseScreenShareProps {
  peerConnection: RTCPeerConnection | null;
  sendScreenShareState: (isSharing: boolean) => void;
  renegotiate: () => Promise<void>;
}

export const useScreenShare = ({
  peerConnection,
  sendScreenShareState,
  renegotiate,
}: UseScreenShareProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [peerIsSharing, setPeerIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const sendersRef = useRef<RTCRtpSender[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stopScreenShare = useCallback(() => {
    // Stop all screen tracks
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;

    // Remove senders from peer connection
    const pc = peerConnection;
    if (pc) {
      sendersRef.current.forEach(sender => {
        try {
          pc.removeTrack(sender);
        } catch (e) {
          console.warn('Error removing screen share sender:', e);
        }
      });
    }
    sendersRef.current = [];

    setIsSharing(false);
    sendScreenShareState(false);

    // Renegotiate to inform peer of track removal
    renegotiate().catch(e => console.warn('Renegotiation after stop failed:', e));

    console.log('Screen share stopped');
  }, [peerConnection, sendScreenShareState, renegotiate]);

  const startScreenShare = useCallback(async (withAudio: boolean = false) => {
    if (!peerConnection) {
      console.warn('No peer connection available for screen share');
      return;
    }

    // Stop any existing screen share first
    if (isSharing) {
      stopScreenShare();
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        } as MediaTrackConstraints,
        audio: withAudio,
      });

      screenStreamRef.current = stream;
      const senders: RTCRtpSender[] = [];

      // Add each track to the peer connection
      stream.getTracks().forEach(track => {
        const sender = peerConnection.addTrack(track, stream);
        senders.push(sender);

        // Handle browser's "Stop sharing" button
        track.onended = () => {
          console.log('Screen share track ended by browser');
          stopScreenShare();
        };
      });

      sendersRef.current = senders;
      setIsSharing(true);
      sendScreenShareState(true);

      // Renegotiate so the peer receives the new track
      await renegotiate();

      console.log('Screen share started', withAudio ? '(with audio)' : '(no audio)');
    } catch (error: any) {
      // User cancelled the screen picker
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        console.log('Screen share cancelled by user');
        return;
      }
      console.error('Error starting screen share:', error);
    }
  }, [peerConnection, isSharing, stopScreenShare, sendScreenShareState, renegotiate]);

  // Called by data channel when peer's screen share state changes
  const handlePeerScreenShareChange = useCallback((peerSharing: boolean) => {
    setPeerIsSharing(peerSharing);

    // Exclusive sharing: if peer starts sharing and we are sharing, stop ours
    if (peerSharing && screenStreamRef.current) {
      console.log('Peer started sharing — stopping local screen share (exclusive)');
      stopScreenShare();
    }
  }, [stopScreenShare]);

  return {
    isSharing,
    peerIsSharing,
    screenStream: screenStreamRef.current,
    startScreenShare,
    stopScreenShare,
    handlePeerScreenShareChange,
  };
};
