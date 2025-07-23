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
}

export default function RoomInterface(props: RoomInterfaceProps) {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

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
    ensureBidirectionalStreaming
  } = props;

  return (
    <div style={{ 
      height: '100vh', 
      backgroundColor: '#202124',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #3c4043',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#1f1f1f',
        zIndex: 10,
        minHeight: '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3c4043',
              color: '#e8eaed',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5f6368'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3c4043'}
          >
            ← Back to Office
          </button>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: '400', 
              color: '#e8eaed' 
            }}>
              {roomId?.charAt(0).toUpperCase() + roomId?.slice(1)} Team Room
            </h1>
            <div style={{ 
              fontSize: '14px', 
              color: '#9aa0a6',
              marginTop: '2px'
            }}>
              {peers.length + 1} participant{peers.length !== 0 ? 's' : ''}
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            padding: '6px 12px', 
            borderRadius: '16px', 
            backgroundColor: isConnected ? '#137333' : '#d93025',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'white'
            }} />
            {connectionStatus}
          </div>
          
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
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: peers.length === 0 ? '1fr' : 
                                   peers.length === 1 ? 'repeat(2, 1fr)' :
                                   peers.length <= 3 ? 'repeat(2, 1fr)' :
                                   'repeat(3, 1fr)',
              gridTemplateRows: peers.length <= 1 ? '1fr' :
                               peers.length <= 3 ? 'repeat(2, 1fr)' :
                               'repeat(2, 1fr)',
              gap: '12px',
              alignItems: 'center',
              justifyItems: 'center'
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
            width: '320px',
            backgroundColor: '#1f1f1f',
            borderLeft: '1px solid #3c4043',
            display: 'flex',
            flexDirection: 'column'
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
        padding: '16px 24px',
        backgroundColor: '#1f1f1f',
        borderTop: '1px solid #3c4043',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: streamRef.current?.getAudioTracks()[0]?.enabled !== false ? '#3c4043' : '#d93025',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: streamRef.current?.getVideoTracks()[0]?.enabled !== false ? '#3c4043' : '#d93025',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: isScreenSharing ? '#137333' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontSize: '20px',
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: showWhiteboard ? '#8e24aa' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
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
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: chatOpen ? '#1a73e8' : '#3c4043',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
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
                width: '16px',
                height: '16px',
                backgroundColor: '#d93025',
                borderRadius: '50%',
                fontSize: '10px',
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
        <button
          onClick={() => router.push('/')}
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
      </div>

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