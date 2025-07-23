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

  /* -------------------------------------------------- */
  // Helpers
  // Build signaling URL: use localhost for local dev, current host for remote (ngrok)
  const signalingUrl = typeof window !== 'undefined' 
    ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `ws://localhost:8000/ws/${roomId}`  // Local development
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/${roomId}`  // Remote/ngrok
    : '';

  const createPeer = (peerId: string, stream: MediaStream, initiator: boolean) => {
    const peer = new Peer({ 
      initiator, 
      trickle: false, 
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('📤 Sending signal to peer:', peerId);
      socketRef.current?.send(
        JSON.stringify({ type: 'signal', id: myId.current, target: peerId, signal: data })
      );
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from peer:', peerId, remoteStream.getTracks());
    });

    peer.on('close', () => {
      console.log('🔌 Peer connection closed:', peerId);
      peersRef.current = peersRef.current.filter((p) => p.id !== peerId);
      setPeers([...peersRef.current]);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected:', peerId);
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error:', peerId, err);
    });

    peer.on('data', (data) => {
      console.log('📨 Received data from peer:', peerId, data);
    });

    return peer;
  };

  const handleSocketMsg = (msg: any, stream: MediaStream) => {
    switch (msg.type) {
      case 'join':
        if (msg.id === myId.current) return;
        console.log('👋 New peer joining:', msg.id);
        // Lexicographical rule prevents duplicate connections
        const initiator = myId.current > msg.id;
        const peer = createPeer(msg.id, stream, initiator);
        peersRef.current.push({ id: msg.id, peer });
        setPeers([...peersRef.current]);
        break;
      case 'signal':
        if (msg.target !== myId.current) return;
        console.log('📡 Received signal from:', msg.id);
        let existing = peersRef.current.find((p) => p.id === msg.id);
        if (!existing) {
          const newPeer = createPeer(msg.id, stream, false);
          existing = { id: msg.id, peer: newPeer };
          peersRef.current.push(existing);
          setPeers([...peersRef.current]);
        }
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
    setMessages((prev) => [...prev, { id: myId.current, text: newMsg.trim() }]);
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
        initiator: peer.initiator
      });
    });
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
        <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
          Connected peers: {peers.length}
        </span>
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
            You
          </div>
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

  useEffect(() => {
    if (!peer) return;
   
    console.log('🔧 Setting up remote video for peer:', peerId);
   
    peer.on('stream', (stream) => {
      console.log('📹 Received video stream from:', peerId);
      console.log('📹 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      setStreamInfo(`Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
      
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
        {peerId.slice(0, 8)}
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