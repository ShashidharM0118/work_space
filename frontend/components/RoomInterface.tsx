import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Peer from 'simple-peer';

interface ChatMsg {
  id: string;
  text: string;
}

interface PeerRef {
  id: string;
  peer: Peer.Instance;
}

interface RoomInterfaceProps {
  roomId: string;
  peers: PeerRef[];
  messages: ChatMsg[];
  newMsg: string;
  isConnected: boolean;
  mediaError: string;
  connectionStatus: string;
  isScreenSharing: boolean;
  showWhiteboard: boolean;
  myVideo: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  streamRef: React.RefObject<MediaStream | null>;
  peersRef: React.RefObject<PeerRef[]>;
  myId: React.RefObject<string>;
  setNewMsg: (msg: string) => void;
  setShowWhiteboard: (show: boolean) => void;
  setPeers: (peers: PeerRef[]) => void;
  sendChat: () => void;
  startScreenShare: () => void;
  stopScreenShare: () => void;
  clearWhiteboard: () => void;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  testConnections: () => void;
  forceReconnect: () => void;
  ensureBidirectionalStreaming: () => void;
  onLeaveRoom?: () => void;
}

export default function RoomInterface(props: RoomInterfaceProps) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    roomId,
    peers,
    messages,
    newMsg,
    isConnected,
    mediaError,
    connectionStatus,
    isScreenSharing,
    showWhiteboard,
    myVideo,
    canvasRef,
    streamRef,
    peersRef,
    myId,
    setNewMsg,
    setShowWhiteboard,
    setPeers,
    sendChat,
    startScreenShare,
    stopScreenShare,
    clearWhiteboard,
    startDrawing,
    draw,
    stopDrawing,
    testConnections,
    forceReconnect,
    ensureBidirectionalStreaming,
    onLeaveRoom
  } = props;

  const shareRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0F1419 0%, #1E293B 25%, #334155 50%, #475569 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{ 
        padding: isMobile ? '16px 20px' : '20px 32px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        zIndex: 10,
        minHeight: isMobile ? '64px' : '72px',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: '12px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '8px' : '16px',
          flex: isMobile ? '1 1 100%' : 'auto',
          order: isMobile ? 1 : 0
        }}>
          <button
            onClick={() => {
              if (onLeaveRoom) onLeaveRoom();
              router.push('/');
            }}
            style={{
              padding: isMobile ? '8px 16px' : '12px 20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(16px)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isMobile ? '←' : '← Back to Office'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: isMobile ? '18px' : '24px', 
              fontWeight: '800', 
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {roomId?.charAt(0).toUpperCase() + roomId?.slice(1)} Team Room
            </h1>
            <div style={{ 
              fontSize: isMobile ? '13px' : '15px', 
              color: 'rgba(255,255,255,0.7)',
              marginTop: '4px',
              fontWeight: '500'
            }}>
              {peers.length + 1} participant{peers.length !== 0 ? 's' : ''} • Enterprise Meeting
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '12px',
          order: isMobile ? 0 : 1
        }}>
          <button
            onClick={shareRoomLink}
            style={{
              padding: isMobile ? '6px 10px' : '8px 12px',
              backgroundColor: '#3c4043',
              color: '#e8eaed',
              border: '1px solid #5f6368',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            title="Share room link"
          >
            🔗 {!isMobile && 'Share'}
          </button>

          <div style={{ 
            padding: isMobile ? '4px 8px' : '6px 12px', 
            borderRadius: '16px', 
            backgroundColor: isConnected ? '#137333' : '#d93025',
            color: 'white',
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: isMobile ? '6px' : '8px',
              height: isMobile ? '6px' : '8px',
              borderRadius: '50%',
              backgroundColor: 'white'
            }} />
            {isMobile ? (isConnected ? 'ON' : 'OFF') : connectionStatus}
          </div>
          
          {!isMobile && (
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              style={{
                padding: '8px 12px',
                backgroundColor: showParticipants ? '#1a73e8' : 'transparent',
                color: showParticipants ? 'white' : '#e8eaed',
                border: '1px solid #5f6368',
                borderRadius: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              👥 {peers.length + 1}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Video/Whiteboard Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#202124',
          position: 'relative'
        }}>
          {mediaError && (
            <div style={{ 
              backgroundColor: '#fce8e6', 
              border: '1px solid #d93025',
              padding: '12px 16px',
              margin: '16px',
              borderRadius: '8px',
              color: '#d93025',
              fontSize: '14px'
            }}>
              ⚠️ {mediaError}
            </div>
          )}

          {showWhiteboard ? (
            /* Whiteboard */
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              padding: '16px',
              gap: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0 16px'
              }}>
                <h3 style={{ 
                  color: '#e8eaed', 
                  margin: 0, 
                  fontSize: '18px',
                  fontWeight: '500'
                }}>
                  🎨 Collaborative Whiteboard
                </h3>
                <button 
                  onClick={clearWhiteboard}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#d93025',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  🗑️ Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                  border: '2px solid #5f6368',
                  borderRadius: '12px',
                  cursor: 'crosshair',
                  backgroundColor: 'white',
                  width: '100%',
                  maxWidth: '800px',
                  height: 'auto',
                  aspectRatio: '8/5',
                  margin: '0 auto'
                }}
              />
            </div>
          ) : (
            /* Video Grid */
            <div style={{ 
              flex: 1,
              padding: isMobile ? '12px' : '16px',
              display: 'grid',
              gridTemplateColumns: isMobile ? 
                (peers.length === 0 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))') :
                (peers.length === 0 ? '1fr' : 
                 peers.length === 1 ? 'repeat(2, 1fr)' :
                 peers.length <= 3 ? 'repeat(2, 1fr)' :
                 'repeat(3, 1fr)'),
              gridTemplateRows: isMobile ? 'auto' :
                               (peers.length <= 1 ? '1fr' :
                                peers.length <= 3 ? 'repeat(2, 1fr)' :
                                'repeat(2, 1fr)'),
              gap: isMobile ? '8px' : '12px',
              alignItems: 'center',
              justifyItems: 'center',
              overflowY: isMobile ? 'auto' : 'hidden'
            }}>
              {/* Local Video */}
              <div style={{ 
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '16/9',
                backgroundColor: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #5f6368'
              }}>
                <video 
                  ref={myVideo} 
                  autoPlay 
                  playsInline 
                  muted
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    objectFit: 'cover'
                  }} 
                />
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  You {isScreenSharing ? '(Screen)' : '(Camera)'}
                </div>
                {!streamRef.current?.getVideoTracks()[0]?.enabled && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '14px'
                  }}>
                    📹 Camera Off
                  </div>
                )}
                {!streamRef.current?.getAudioTracks()[0]?.enabled && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: '#d93025',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    🔇 Muted
                  </div>
                )}
              </div>

              {/* Remote Videos */}
              {peers.map(({ id }) => (
                <RemoteVideo 
                  key={id} 
                  peer={peersRef.current?.find((p) => p.id === id)?.peer}
                  peerId={id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {chatOpen && (
          <div style={{
            width: isMobile ? '100%' : '320px',
            backgroundColor: '#1f1f1f',
            borderLeft: isMobile ? 'none' : '1px solid #3c4043',
            borderTop: isMobile ? '1px solid #3c4043' : 'none',
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'absolute' : 'relative',
            top: isMobile ? 0 : 'auto',
            left: isMobile ? 0 : 'auto',
            right: isMobile ? 0 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            zIndex: isMobile ? 100 : 'auto'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #3c4043',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                color: '#e8eaed', 
                margin: 0, 
                fontSize: '16px',
                fontWeight: '500'
              }}>
                Chat
              </h3>
              <button
                onClick={() => setChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9aa0a6',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ 
              flex: 1,
              overflowY: 'auto', 
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  backgroundColor: m.id === myId.current ? '#1a73e8' : '#3c4043',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  alignSelf: m.id === myId.current ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}>
                  {m.id !== myId.current && (
                    <div style={{ 
                      fontSize: '11px', 
                      opacity: 0.8, 
                      marginBottom: '4px',
                      fontWeight: '500'
                    }}>
                      {m.id.slice(0, 8)}
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
            </div>
            
            <div style={{ 
              padding: '16px 20px',
              borderTop: '1px solid #3c4043',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                disabled={!isConnected}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  border: '1px solid #5f6368',
                  borderRadius: '20px',
                  backgroundColor: '#3c4043',
                  color: '#e8eaed',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button 
                onClick={sendChat}
                disabled={!isConnected || !newMsg.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isConnected && newMsg.trim() ? '#1a73e8' : '#5f6368',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: isConnected && newMsg.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: isMobile ? '8px' : '12px',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '6px' : '8px',
          justifyContent: 'center',
          flex: 1
        }}>
          {/* Microphone */}
          <button 
            onClick={() => {
              if (streamRef.current) {
                const audioTrack = streamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  setPeers([...peersRef.current || []]);
                }
              }
            }}
            disabled={!streamRef.current}
            style={{
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
              borderRadius: '50%',
              backgroundColor: streamRef.current?.getAudioTracks()[0]?.enabled !== false ? '#3c4043' : '#d93025',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title={streamRef.current?.getAudioTracks()[0]?.enabled !== false ? 'Mute' : 'Unmute'}
          >
            {streamRef.current?.getAudioTracks()[0]?.enabled !== false ? '🎤' : '🔇'}
          </button>

          {/* Camera */}
          <button 
            onClick={() => {
              if (streamRef.current) {
                const videoTrack = streamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                  videoTrack.enabled = !videoTrack.enabled;
                  setPeers([...peersRef.current || []]);
                }
              }
            }}
            disabled={!streamRef.current}
            style={{
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
              borderRadius: '50%',
              backgroundColor: streamRef.current?.getVideoTracks()[0]?.enabled !== false ? '#3c4043' : '#d93025',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title={streamRef.current?.getVideoTracks()[0]?.enabled !== false ? 'Turn off camera' : 'Turn on camera'}
          >
            {streamRef.current?.getVideoTracks()[0]?.enabled !== false ? '📹' : '📵'}
          </button>

          {/* Screen Share */}
          <button 
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            disabled={!isConnected}
            style={{
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
              borderRadius: '50%',
              backgroundColor: isScreenSharing ? '#137333' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontSize: isMobile ? '18px' : '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: isConnected ? 1 : 0.5
            }}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            🖥️
          </button>

          {/* Whiteboard */}
          <button 
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            style={{
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
              borderRadius: '50%',
              backgroundColor: showWhiteboard ? '#8e24aa' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title={showWhiteboard ? 'Show video' : 'Open whiteboard'}
          >
            {showWhiteboard ? '📹' : '🎨'}
          </button>

          {/* Chat */}
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              width: isMobile ? '44px' : '48px',
              height: isMobile ? '44px' : '48px',
              borderRadius: '50%',
              backgroundColor: chatOpen ? '#1a73e8' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            title="Chat"
          >
            💬
            {messages.length > 0 && !chatOpen && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: isMobile ? '14px' : '16px',
                height: isMobile ? '14px' : '16px',
                backgroundColor: '#d93025',
                borderRadius: '50%',
                fontSize: isMobile ? '9px' : '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {messages.length > 9 ? '9+' : messages.length}
              </div>
            )}
          </button>
        </div>

        {/* Leave Button */}
        {!isMobile && (
          <button
            onClick={() => {
              if (onLeaveRoom) onLeaveRoom();
              router.push('/');
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#d93025',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              marginLeft: '24px'
            }}
          >
            Leave
          </button>
        )}
        
        {/* Mobile Leave Button */}
        {isMobile && (
          <button
            onClick={() => {
              if (onLeaveRoom) onLeaveRoom();
              router.push('/');
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#d93025',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Leave room"
          >
            ❌
          </button>
        )}
      </div>

      {/* Copy Success Toast */}
      {copySuccess && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '24px',
          right: isMobile ? '16px' : '24px',
          backgroundColor: '#10B981',
          color: 'white',
          padding: isMobile ? '8px 16px' : '12px 20px',
          borderRadius: '12px',
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: '500',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1001,
          animation: 'slideInUp 0.3s ease'
        }}>
          ✅ Link copied to clipboard!
        </div>
      )}

      {/* Dev Tools */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          opacity: 0.7
        }}>
          <button onClick={testConnections} style={{ padding: '4px 8px', fontSize: '10px' }}>
            🔍
          </button>
          <button onClick={forceReconnect} disabled={!isConnected} style={{ padding: '4px 8px', fontSize: '10px' }}>
            🔄
          </button>
          <button onClick={ensureBidirectionalStreaming} disabled={!isConnected || peers.length === 0} style={{ padding: '4px 8px', fontSize: '10px' }}>
            🔁
          </button>
        </div>
      )}
    </div>
  );
}

/* Remote Video Component with Google Meet styling */
function RemoteVideo({ peer, peerId }: { peer: Peer.Instance | undefined; peerId: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [isRemoteScreenShare, setIsRemoteScreenShare] = useState(false);

  useEffect(() => {
    if (!peer) return;
    
    peer.on('stream', (stream: MediaStream) => {
      const videoTracks = stream.getVideoTracks();
      
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        const isScreenShare = videoTrack.label.toLowerCase().includes('screen') || 
                             videoTrack.label.toLowerCase().includes('display');
        setIsRemoteScreenShare(isScreenShare);
      }
      
      if (ref.current) {
        ref.current.srcObject = stream;
        setHasStream(true);
        ref.current.play().catch(err => console.error('Failed to play remote video:', err));
      }
    });
    
    return () => {
      console.log('Cleaning up remote video for:', peerId);
    };
  }, [peer, peerId]);

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      aspectRatio: '16/9',
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '2px solid #5f6368'
    }}>
      <video 
        ref={ref} 
        autoPlay 
        playsInline 
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover'
        }} 
      />
      {isRemoteScreenShare && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: '#137333',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500'
        }}>
          🖥️ SCREEN
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {peerId.slice(0, 8)} {isRemoteScreenShare ? '(Screen)' : '(Camera)'}
      </div>
      {!hasStream && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          🔗 Connecting...
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
            {peerId.slice(0, 8)}
          </div>
        </div>
      )}
    </div>
  );
} 