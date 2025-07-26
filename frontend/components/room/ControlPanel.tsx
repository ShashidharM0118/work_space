import React from 'react';
import { MutableRefObject } from 'react';
import { useRouter } from 'next/router';

interface Props {
  isMobile: boolean;
  streamRef: MutableRefObject<MediaStream | null>;
  toggleScreenShare: () => void;
  isScreenSharing: boolean;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  showWhiteboard: boolean;
  setShowWhiteboard: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
  officeId: string | null;
  messages: any[];
  isConnected: boolean;
  connectionStatus: string;
}

const ControlPanel: React.FC<Props> = ({
  isMobile,
  streamRef,
  toggleScreenShare,
  isScreenSharing,
  showChat,
  setShowChat,
  showWhiteboard,
  setShowWhiteboard,
  router,
  officeId,
  messages,
  isConnected,
  connectionStatus
}) => {
  const audioEnabled = streamRef.current?.getAudioTracks()[0]?.enabled !== false;
  const videoEnabled = streamRef.current?.getVideoTracks()[0]?.enabled !== false;

  return (
    <div style={{ position: 'fixed', bottom: isMobile ? 24 : 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => {
          const track = streamRef.current?.getAudioTracks()[0];
          if (track) track.enabled = !track.enabled;
        }}>
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={() => {
          const track = streamRef.current?.getVideoTracks()[0];
          if (track) track.enabled = !track.enabled;
        }}>
          {videoEnabled ? 'Camera Off' : 'Camera On'}
        </button>
        <button onClick={() => router.push(`/office/${officeId}`)}>Leave</button>
        {!isMobile && (
          <button onClick={toggleScreenShare}>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</button>
        )}
        <button onClick={() => setShowChat(!showChat)}>Chat {messages.length > 0 && !showChat && `(${messages.length})`}</button>
        <button onClick={() => setShowWhiteboard(!showWhiteboard)}>{showWhiteboard ? 'Hide Board' : 'Whiteboard'}</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: isConnected ? '#0F9D58' : '#EA4335', marginRight: 6 }} />
        {connectionStatus}
      </div>
    </div>
  );
};

export default ControlPanel;
