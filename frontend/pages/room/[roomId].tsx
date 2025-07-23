import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';

interface ChatMsg {
  id: string;
  text: string;
}

interface PeerRef {
  id: string;
  peer: Peer.Instance;
}

export default function Room() {
  const router = useRouter();
  const { roomId } = router.query as { roomId: string };

  const myId = useRef(uuidv4());
  const myVideo = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerRef[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [peers, setPeers] = useState<PeerRef[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [originalStream, setOriginalStream] = useState<MediaStream | null>(null);

  /* -------------------------------------------------- */
  // Helpers
  // Build signaling URL: use localhost for local dev, current host for remote (ngrok)
  const signalingUrl = typeof window !== 'undefined' 
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `ws://localhost:8000/ws/${roomId}`  // Local development
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/${roomId}`  // Remote/ngrok
    : '';

  // Screen sharing helpers
  const startScreenShare = async () => {
    try {
      if (!streamRef.current) return;
      
      // Save the original camera stream
      setOriginalStream(streamRef.current);
      
      // Get screen share stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true // Include system audio if possible
      });
      
      console.log('🖥️ Screen share started:', screenStream.getTracks());
      
      // Update local video
      if (myVideo.current) {
        myVideo.current.srcObject = screenStream;
      }
      
      // Replace tracks for all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = screenStream.getAudioTracks()[0] || streamRef.current.getAudioTracks()[0];
      
      peersRef.current.forEach(peerRef => {
        const sender = peerRef.peer._pc?.getSenders?.();
        if (sender) {
          const videoSender = sender.find((s: any) => s.track?.kind === 'video');
          const audioSender = sender.find((s: any) => s.track?.kind === 'audio');
          
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
          if (audioSender && audioTrack) {
            audioSender.replaceTrack(audioTrack);
          }
        }
      });
      
      streamRef.current = screenStream;
      setIsScreenSharing(true);
      
      // Handle screen share ending (user clicks stop in browser)
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
    } catch (err) {
      console.error('❌ Screen share failed:', err);
      alert('Screen sharing failed: ' + (err as Error).message);
    }
  };
  
  const stopScreenShare = async () => {
    try {
      if (!originalStream) return;
      
      console.log('🔄 Stopping screen share, returning to camera');
      
      // Stop screen share tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Get fresh camera stream or use original
      let cameraStream = originalStream;
      if (!cameraStream.active) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }
      
      // Update local video
      if (myVideo.current) {
        myVideo.current.srcObject = cameraStream;
        myVideo.current.muted = true;
      }
      
      // Replace tracks for all peer connections
      const videoTrack = cameraStream.getVideoTracks()[0];
      const audioTrack = cameraStream.getAudioTracks()[0];
      
      peersRef.current.forEach(peerRef => {
        const sender = peerRef.peer._pc?.getSenders?.();
        if (sender) {
          const videoSender = sender.find((s: any) => s.track?.kind === 'video');
          const audioSender = sender.find((s: any) => s.track?.kind === 'audio');
          
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
          if (audioSender && audioTrack) {
            audioSender.replaceTrack(audioTrack);
          }
        }
      });
      
      streamRef.current = cameraStream;
      setIsScreenSharing(false);
      setOriginalStream(null);
      
    } catch (err) {
      console.error('❌ Failed to stop screen share:', err);
    }
  };

  const createPeer = (peerId: string, stream: MediaStream, initiator: boolean) => {
    // Create peer with proper configuration for bidirectional streaming
    const peer = new Peer({ 
      initiator, 
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    console.log(`🔧 Creating peer for ${peerId} - initiator: ${initiator}`);
    console.log(`📹 Local stream tracks:`, stream.getTracks().map(t => `${t.kind}: ${t.label} (${t.enabled})`));

    // Add stream to peer connection immediately
    try {
      peer.addStream(stream);
      console.log(`✅ Stream added to peer ${peerId}`);
    } catch (error) {
      console.error(`❌ Failed to add stream to peer ${peerId}:`, error);
    }

    peer.on('signal', (data) => {
      console.log('📤 Sending signal to peer:', peerId, 'Type:', data.type);
      socketRef.current?.send(
        JSON.stringify({ type: 'signal', id: myId.current, target: peerId, signal: data })
      );
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from peer:', peerId);
      console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.label} (${t.enabled})`));
      
      // Verify stream is actually flowing
      setTimeout(() => {
        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack) {
          console.log('📊 Video track state after 2s:', {
            enabled: videoTrack.enabled,
            muted: videoTrack.muted,
            readyState: videoTrack.readyState
          });
        }
      }, 2000);
    });

    peer.on('close', () => {
      console.log('🔌 Peer connection closed:', peerId);
      peersRef.current = peersRef.current.filter((p) => p.id !== peerId);
      setPeers([...peersRef.current]);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected:', peerId);
      console.log('🔗 Connection state:', peer.connected, 'Destroyed:', peer.destroyed);
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', peerId, err);
      console.error('❌ Error details:', {
        type: err.name,
        message: err.message,
        code: (err as any).code
      });
    });

    peer.on('data', (data) => {
      console.log('📨 Received data from peer:', peerId, data);
    });

    // Monitor connection state changes
    if (peer._pc) {
      peer._pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state for ${peerId}:`, peer._pc.iceConnectionState);
       
       // Auto-reconnect on failed connections
       if (peer._pc.iceConnectionState === 'failed') {
         console.log(`🔄 ICE failed for ${peerId}, attempting to reconnect...`);
         setTimeout(() => {
           if (peer._pc.iceConnectionState === 'failed') {
             forceReconnectPeer(peerId);
           }
         }, 3000);
       }
      };
      
      peer._pc.onconnectionstatechange = () => {
        console.log(`🔗 Connection state for ${peerId}:`, peer._pc.connectionState);
      };
    }

    return peer;
  };

  const handleSocketMsg = (msg: any, stream: MediaStream) => {
    switch (msg.type) {
      case 'join':
        if (msg.id === myId.current) return;
        console.log('👋 New peer joining:', msg.id);
        // Lexicographical rule prevents duplicate connections
        const initiator = myId.current > msg.id;
        console.log('🔄 Creating peer connection - I am initiator:', initiator);
        const peer = createPeer(msg.id, stream, initiator);
        peersRef.current.push({ id: msg.id, peer });
        setPeers([...peersRef.current]);
        break;
      case 'signal':
        if (msg.target !== myId.current) return;
        console.log('📡 Received signal from:', msg.id);
        let existing = peersRef.current.find((p) => p.id === msg.id);
        if (!existing) {
          console.log('🆕 Creating new peer for incoming signal from:', msg.id);
          const newPeer = createPeer(msg.id, stream, false);
          existing = { id: msg.id, peer: newPeer };
          peersRef.current.push(existing);
          setPeers([...peersRef.current]);
        }
        console.log('📨 Signaling peer:', msg.id, 'Signal type:', msg.signal.type);
        existing.peer.signal(msg.signal);
        break;
      case 'chat':
        console.log('💬 Chat message from:', msg.id);
        setMessages((prev) => [...prev, { id: msg.id, text: msg.text }]);
        break;
    }
  };

  /* -------------------------------------------------- */
  // Lifecycle
  useEffect(() => {
    if (!roomId) return;

    setConnectionStatus('Getting camera access...');
   
   // Request both video and audio with specific constraints
    navigator.mediaDevices
     .getUserMedia({ 
       video: { 
         width: { ideal: 1280 },
         height: { ideal: 720 },
         frameRate: { ideal: 30 }
       }, 
       audio: {
         echoCancellation: true,
         noiseSuppression: true,
         autoGainControl: true
       }
     })
      .then((stream) => {
        streamRef.current = stream;
        setMediaError('');
       
       console.log('🎥 Got local stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
       
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          myVideo.current.muted = true;
        }

        setConnectionStatus('Connecting to room...');
        const ws = new WebSocket(signalingUrl);
        socketRef.current = ws;

        console.log('🔗 Attempting WebSocket connection to:', signalingUrl);

        ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          setIsConnected(true);
          setConnectionStatus('Connected');
          ws.send(JSON.stringify({ type: 'join', id: myId.current }));
          console.log('📤 Sent join message:', { type: 'join', id: myId.current });
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionStatus('Connection failed');
        };

        ws.onclose = (event) => {
          console.warn('🔌 WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setConnectionStatus('Disconnected');
        };

        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          console.log('📥 Received message:', data);
          handleSocketMsg(data, stream);
        };
      })
      .catch((err) => {
        console.error('Media error', err);
        setMediaError(`Camera/microphone access denied: ${err.message}`);
        setConnectionStatus('Media access failed');
      });

    return () => {
      socketRef.current?.close();
      peersRef.current.forEach((p) => p.peer.destroy());
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]);

  /* -------------------------------------------------- */
  // Chat helpers
  const sendChat = () => {
    if (!newMsg.trim() || !isConnected) return;
    socketRef.current?.send(JSON.stringify({ type: 'chat', id: myId.current, text: newMsg.trim() }));
    setNewMsg('');
  };

  // Debug helpers
  const testConnections = () => {
    console.log('🔍 Connection Test:');
    console.log('- WebSocket:', socketRef.current?.readyState === 1 ? '✅ Connected' : '❌ Disconnected');
    console.log('- Local stream:', streamRef.current ? '✅ Active' : '❌ None');
    console.log('- Local tracks:', streamRef.current?.getTracks().map(t => `${t.kind}: ${t.enabled}`) || 'None');
    console.log('- Peers count:', peersRef.current.length);
    
    peersRef.current.forEach((peerRef, i) => {
      const peer = peerRef.peer;
      console.log(`- Peer ${i + 1} (${peerRef.id.slice(0, 8)}):`, {
        connected: peer.connected,
        destroyed: peer.destroyed,
        initiator: peer.initiator,
        iceConnectionState: peer._pc?.iceConnectionState,
        connectionState: peer._pc?.connectionState
      });
    });
  };

  // Stream validation and retry mechanism
  const ensureBidirectionalStreaming = () => {
    console.log('🔄 Ensuring bidirectional streaming...');
    
    peersRef.current.forEach((peerRef, index) => {
      const peer = peerRef.peer;
      const peerId = peerRef.id;
      
      console.log(`📊 Checking peer ${index + 1} (${peerId.slice(0, 8)}):`);
      console.log(`- Connected: ${peer.connected}`);
      console.log(`- ICE State: ${peer._pc?.iceConnectionState}`);
      console.log(`- Has remote stream: ${peer.remoteStream ? 'Yes' : 'No'}`);
      
      // If peer is connected but no remote stream, try to trigger stream exchange
      if (peer.connected && !peer.remoteStream && streamRef.current) {
        console.log(`🔧 Re-adding stream to connected peer ${peerId.slice(0, 8)}`);
        try {
          // Remove existing tracks first
          if (peer._pc) {
            peer._pc.getSenders().forEach(sender => {
              if (sender.track) {
                peer._pc.removeTrack(sender);
              }
            });
          }
          
          // Re-add current stream
          peer.addStream(streamRef.current);
          console.log(`✅ Stream re-added to peer ${peerId.slice(0, 8)}`);
        } catch (error) {
          console.error(`❌ Failed to re-add stream to peer ${peerId.slice(0, 8)}:`, error);
        }
      }
    });
  };

  const forceReconnect = () => {
    console.log('🔄 Force reconnecting all peers...');
    
    if (!streamRef.current) {
      console.error('❌ No local stream to reconnect with');
      return;
    }
    
    // Destroy existing peer connections
    peersRef.current.forEach(peerRef => {
      console.log('💥 Destroying peer:', peerRef.id.slice(0, 8));
      peerRef.peer.destroy();
    });
    
    // Clear peers array
    peersRef.current = [];
    setPeers([]);
    
    // Re-announce presence to trigger new connections
    if (socketRef.current?.readyState === 1) {
      console.log('📢 Re-announcing presence in room');
      socketRef.current.send(JSON.stringify({ type: 'join', id: myId.current }));
    }
  };

  const forceReconnectPeer = (peerId: string) => {
    console.log(`🔄 Force reconnecting peer: ${peerId}`);
    const peerRef = peersRef.current.find(p => p.id === peerId);
    if (!peerRef) {
      console.warn(`Peer with ID ${peerId} not found for force reconnect.`);
      return;
    }

    if (!streamRef.current) {
      console.error('❌ No local stream to reconnect with');
      return;
    }

    // Destroy existing peer connection
    peerRef.peer.destroy();

    // Create new peer connection
    const initiator = myId.current > peerId;
    const newPeer = createPeer(peerId, streamRef.current, initiator);
    peersRef.current = peersRef.current.map(p => p.id === peerId ? { ...p, peer: newPeer } : p);
    setPeers([...peersRef.current]);
    console.log(`✅ Peer ${peerId} reconnected.`);
  };

  /* -------------------------------------------------- */
  return (
    <div style={{ padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Room: {roomId}</h2>
        <div style={{ 
          padding: '8px 16px', 
          borderRadius: 4, 
          backgroundColor: isConnected ? '#4CAF50' : '#f44336',
          color: 'white',
          fontSize: '14px'
        }}>
          {connectionStatus}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={testConnections}
          style={{
            padding: '4px 8px',
            backgroundColor: '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔍 Test Connections (Check Console)
        </button>
        <button 
          onClick={forceReconnect}
          disabled={!isConnected}
          style={{
            padding: '4px 8px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: '12px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            marginLeft: 8
          }}
        >
          🔄 Force Reconnect
        </button>
        <button 
          onClick={ensureBidirectionalStreaming}
          disabled={!isConnected || peers.length === 0}
          style={{
            padding: '4px 8px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: '12px',
            cursor: isConnected && peers.length > 0 ? 'pointer' : 'not-allowed',
            marginLeft: 8
          }}
        >
          🔁 Fix Streaming
        </button>
        <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
          Connected peers: {peers.length}
        </span>
      </div>

      {/* Media Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button 
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          disabled={!isConnected}
          style={{
            padding: '8px 16px',
            backgroundColor: isScreenSharing ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isConnected ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          {isScreenSharing ? '🔄 Stop Sharing' : '🖥️ Share Screen'}
        </button>
        
        <button 
          onClick={() => {
            if (streamRef.current) {
              const videoTrack = streamRef.current.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                // Force re-render to update button text
                setPeers([...peersRef.current]);
              }
            }
          }}
          disabled={!streamRef.current}
          style={{
            padding: '8px 16px',
            backgroundColor: streamRef.current?.getVideoTracks()[0]?.enabled !== false ? '#2196F3' : '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {streamRef.current?.getVideoTracks()[0]?.enabled !== false ? '📹 Camera On' : '📹 Camera Off'}
        </button>
        
        <button 
          onClick={() => {
            if (streamRef.current) {
              const audioTrack = streamRef.current.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                // Force re-render to update button text
                setPeers([...peersRef.current]);
              }
            }
          }}
          disabled={!streamRef.current}
          style={{
            padding: '8px 16px',
            backgroundColor: streamRef.current?.getAudioTracks()[0]?.enabled !== false ? '#2196F3' : '#9E9E9E',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {streamRef.current?.getAudioTracks()[0]?.enabled !== false ? '🎤 Mic On' : '🎤 Mic Off'}
        </button>
      </div>

      {mediaError && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          padding: 16,
          borderRadius: 4,
          marginBottom: 16,
          color: '#d32f2f'
        }}>
          ⚠️ {mediaError}
        </div>
      )}

      {/* Video grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <video 
            ref={myVideo} 
            autoPlay 
            playsInline 
            style={{ width: '100%', borderRadius: 8, backgroundColor: '#000' }} 
          />
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '12px'
          }}>
            You {isScreenSharing ? '(Screen)' : '(Camera)'}
          </div>
          {!streamRef.current?.getVideoTracks()[0]?.enabled && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 4,
              textAlign: 'center'
            }}>
              📹 Camera Off
            </div>
          )}
          {!streamRef.current?.getAudioTracks()[0]?.enabled && (
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255,0,0,0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '12px'
            }}>
              🔇 Muted
            </div>
          )}
        </div>
        {peers.map(({ id }) => (
          <RemoteVideo 
            key={id} 
            peer={peersRef.current.find((p) => p.id === id)?.peer}
            peerId={id}
          />
        ))}
      </div>

      {/* Chat */}
      <div>
        <h3>Chat</h3>
        <div style={{ 
          height: 200, 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          padding: 12,
          borderRadius: 4,
          backgroundColor: '#fafafa',
          marginBottom: 8
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{m.id === myId.current ? 'Me' : m.id.slice(0, 5)}: </strong>
              {m.text}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{ 
              flex: 1, 
              padding: 8, 
              border: '1px solid #ddd',
              borderRadius: 4
            }}
          />
          <button 
            onClick={sendChat}
            disabled={!isConnected || !newMsg.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isConnected ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: isConnected ? 'pointer' : 'not-allowed'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Remote Video Component -------------------- */
function RemoteVideo({ peer, peerId }: { peer: Peer.Instance | undefined; peerId: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [streamInfo, setStreamInfo] = useState('');
  const [isRemoteScreenShare, setIsRemoteScreenShare] = useState(false);

  useEffect(() => {
    if (!peer) return;
    
    console.log('🔧 Setting up remote video for peer:', peerId);
    
    peer.on('stream', (stream) => {
      console.log('📹 Received video stream from:', peerId);
      console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      setStreamInfo(`Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
      
      // Detect if it's a screen share (screen shares typically have different characteristics)
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        // Screen shares often have 'screen' in the label or different constraints
        const isScreenShare = videoTrack.label.toLowerCase().includes('screen') || 
                             videoTrack.label.toLowerCase().includes('display') ||
                             videoTrack.getSettings?.().displaySurface === 'monitor';
        setIsRemoteScreenShare(isScreenShare);
        console.log('🖥️ Remote screen share detected:', isScreenShare, 'Label:', videoTrack.label);
      }
      
      if (ref.current) {
        ref.current.srcObject = stream;
        setHasStream(true);
        
        // Ensure the video element plays
        ref.current.play().catch(err => {
          console.error('❌ Failed to play remote video:', err);
        });
      }
    });
    
    peer.on('connect', () => {
      console.log('✅ Peer data channel connected:', peerId);
    });
    
    peer.on('error', (err) => {
      console.error('❌ Remote peer error:', peerId, err);
      setStreamInfo('Error: ' + err.message);
    });
    
    return () => {
      console.log('🧹 Cleaning up remote video for:', peerId);
    };
  }, [peer]);

  return (
    <div style={{ position: 'relative' }}>
      <video 
        ref={ref} 
        autoPlay 
        playsInline 
        controls={false}
        style={{ 
          width: '100%', 
          borderRadius: 8, 
          backgroundColor: '#000',
          minHeight: '200px'
        }} 
      />
      {/* Screen share indicator */}
      {isRemoteScreenShare && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          🖥️ SCREEN
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: '12px'
      }}>
        {peerId.slice(0, 8)} {isRemoteScreenShare ? '(Screen)' : '(Camera)'}
        {streamInfo && <div style={{ fontSize: '10px' }}>{streamInfo}</div>}
      </div>
      {!hasStream && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center'
        }}>
          🔗 Connecting...
          <div style={{ fontSize: '12px', marginTop: 4 }}>
            Waiting for stream from {peerId.slice(0, 8)}
          </div>
        </div>
      )}
    </div>
  );
} 