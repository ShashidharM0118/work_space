import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import SimplePeer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { startActivityTracking, stopActivityTracking, updateActivityHeartbeat, getUserRoleInOffice } from '../../lib/firebase';

interface PeerRef {
  id: string;
  peer: SimplePeer.Instance;
}

interface ChatMsg {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
}

export default function Room() {
  const router = useRouter();
  const { roomId } = router.query as { roomId: string };
  const { user } = useAuth();

  // Check authentication status
  useEffect(() => {
    if (user === null) {
      console.log('🚫 User not authenticated, redirecting to home');
      router.push('/');
      return;
    }
    
    if (user !== undefined) {
      setIsAuthChecking(false);
      console.log('✅ User authenticated:', user.uid);
    }
  }, [user, router]);

  // Use Firebase user ID if available, otherwise generate UUID
  const myId = useRef(user?.uid || uuidv4());
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
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [participants, setParticipants] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [isUserActive, setIsUserActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState<Date>(new Date());
  const [officeJoinedDate, setOfficeJoinedDate] = useState<string>('');
  const [totalWorkingHours, setTotalWorkingHours] = useState(0);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [activitySessionId, setActivitySessionId] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Whiteboard helpers
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Build signaling URL with better error handling
  const getSignalingUrl = () => {
    if (typeof window === 'undefined') return '';
    
    // Debug: Log the roomId to understand what's being passed
    console.log('🔍 Building WebSocket URL with roomId:', roomId);
    console.log('🔍 Current window location:', window.location.href);
    
    // Use environment variable for backend WebSocket URL
    const BACKEND_WEBSOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
    
    if (!BACKEND_WEBSOCKET_URL) {
      console.error('❌ NEXT_PUBLIC_BACKEND_WS_URL environment variable is not set!');
      console.error('❌ Please set NEXT_PUBLIC_BACKEND_WS_URL in your environment');
      
      // Fallback for local development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const fallbackUrl = 'ws://localhost:8000';
        const url = `${fallbackUrl}/ws/${roomId}`;
        console.log('🔗 Local fallback WebSocket URL:', url);
        return url;
      }
      
      // Fallback for production
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const fallbackUrl = `${protocol}://${window.location.hostname}:8000`;
      const url = `${fallbackUrl}/ws/${roomId}`;
      console.log('🔗 Production fallback WebSocket URL:', url);
      return url;
    }
    
    const url = `${BACKEND_WEBSOCKET_URL}/ws/${roomId}`;
    console.log('🔗 Environment WebSocket URL:', url);
    console.log('🔗 Environment variable value:', BACKEND_WEBSOCKET_URL);
    return url;
  };

  // Get user name from Firebase user profile
  useEffect(() => {
    if (user?.displayName) {
      setUserName(user.displayName);
      localStorage.setItem('userName', user.displayName);
    } else if (user?.email) {
      // Use email as fallback if displayName is not available
      const emailName = user.email.split('@')[0];
      setUserName(emailName);
      localStorage.setItem('userName', emailName);
    } else {
      // Only use stored name if user is authenticated but no displayName/email
      const storedName = localStorage.getItem('userName');
      if (storedName && user) {
        setUserName(storedName);
      } else {
        setUserName('');
      }
    }
  }, [user]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user is owner and get office ID
  useEffect(() => {
    if (user && roomId) {
      const checkUserRole = async () => {
        // Get office ID from URL params or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const officeIdFromUrl = urlParams.get('officeId');
        const officeIdFromStorage = localStorage.getItem('currentOfficeId');
        const currentOfficeId = officeIdFromUrl || officeIdFromStorage || 'default';
        
        setOfficeId(currentOfficeId);
        
        // Get user role from Firebase instead of localStorage
        try {
          const userRole = await getUserRoleInOffice(user.uid, currentOfficeId);
          const isOwnerStatus = userRole === 'owner';
          setIsOwner(isOwnerStatus);
          
          console.log('🔍 Role Detection from Firebase:', {
            userId: user.uid,
            currentOfficeId,
            userRole,
            isOwner: isOwnerStatus
          });
        } catch (error) {
          console.error('Error determining user role:', error);
          // Fallback to member role if there's an error
          setIsOwner(false);
        }
      };

      checkUserRole();
    }
  }, [user, roomId]);

  /* -------------------------------------------------- */
  // Simple Peer Helpers
  const createPeer = (targetId: string, stream: MediaStream, initiator: boolean): SimplePeer.Instance => {
    console.log(`🔗 Creating peer connection to ${targetId}, initiator: ${initiator}`);
    console.log('📺 Local stream for peer:', stream ? 'Available' : 'Missing');
    console.log('📺 Stream tracks:', stream ? stream.getTracks().map(t => `${t.kind}: ${t.enabled}`) : 'No tracks');
    
    const peerConfig: any = {
      initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          }
        ]
      }
    };
    
    // Add stream if available
    if (stream) {
      peerConfig.stream = stream;
    }
    
    const peer = new SimplePeer(peerConfig);

    peer.on('signal', (signal) => {
      console.log('📡 Sending signal to:', targetId, 'Type:', signal.type);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'signal',
          id: myId.current,
          target: targetId,
          signal
        }));
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('📺 Received stream from:', targetId);
      console.log('📺 Stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      // The stream will be handled by the PeerVideo component
    });

    peer.on('error', (err) => {
      console.error('❌ Peer error with', targetId, ':', err);
      // Don't immediately destroy on error, let it retry
    });

    peer.on('close', () => {
      console.log('🔌 Peer connection closed with:', targetId);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected successfully with:', targetId);
    });

    return peer;
  };

  // Whiteboard functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showWhiteboard) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPosition({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !showWhiteboard) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Send draw action to other participants
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'draw',
        id: myId.current,
        from: lastPosition,
        to: { x, y }
      }));
    }
    
    setLastPosition({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Send clear action to other participants
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'clear',
        id: myId.current
      }));
    }
  };

  const handleRemoteDrawing = (msg: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (msg.type === 'draw') {
      ctx.beginPath();
      ctx.moveTo(msg.from.x, msg.from.y);
      ctx.lineTo(msg.to.x, msg.to.y);
      ctx.stroke();
    } else if (msg.type === 'clear') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  /* -------------------------------------------------- */
  // WebSocket message handling
  const handleSocketMsg = (msg: any, stream: MediaStream) => {
    switch (msg.type) {
      case 'participants_list':
        console.log('👥 Received participants list:', msg.participants);
        setParticipants(msg.participants || []);
        
        // Create peer connections for existing participants
        if (msg.participants && msg.participants.length > 0) {
          msg.participants.forEach((participant: any) => {
            if (participant.id !== myId.current) {
              const existingPeer = peersRef.current.find(p => p.id === participant.id);
              if (!existingPeer) {
                console.log('🔄 Creating peer for existing participant:', participant.name, participant.id);
                const initiator = myId.current > participant.id;
                const peer = createPeer(participant.id, stream, initiator);
                peersRef.current.push({ id: participant.id, peer });
                setPeers([...peersRef.current]);
              }
            }
          });
        }
        break;
        
      case 'user_joined':
        console.log('👋 User joined:', msg.user);
        setParticipants(prev => {
          // Avoid duplicates
          const exists = prev.find(p => p.id === msg.user.id);
          if (exists) return prev;
          return [...prev, msg.user];
        });
        
        // Create peer connection for new user
        if (msg.user.id !== myId.current) {
          // Check if peer already exists
          const existingPeer = peersRef.current.find(p => p.id === msg.user.id);
          if (!existingPeer) {
          const initiator = myId.current > msg.user.id;
          console.log('🔄 Creating peer connection - I am initiator:', initiator);
          const peer = createPeer(msg.user.id, stream, initiator);
          peersRef.current.push({ id: msg.user.id, peer });
          setPeers([...peersRef.current]);
          } else {
            console.log('⚠️ Peer already exists for user:', msg.user.id);
          }
        }
        break;
        
      case 'user_left':
        console.log('👋 User left:', msg.user_id);
        setParticipants(prev => prev.filter(p => p.id !== msg.user_id));
        
        // Remove peer connection
        const peerIndex = peersRef.current.findIndex(p => p.id === msg.user_id);
        if (peerIndex !== -1) {
          peersRef.current[peerIndex].peer.destroy();
          peersRef.current.splice(peerIndex, 1);
          setPeers([...peersRef.current]);
        }
        break;
        
      case 'signal':
        if (msg.target !== myId.current) return;
        console.log('📡 Received signal from:', msg.sender);
        
        let existing = peersRef.current.find((p) => p.id === msg.sender);
        if (!existing) {
          console.log('🆕 Creating new peer for incoming signal from:', msg.sender);
          const newPeer = createPeer(msg.sender, stream, false);
          existing = { id: msg.sender, peer: newPeer };
          peersRef.current.push(existing);
          setPeers([...peersRef.current]);
        }
        
        console.log('📨 Signaling peer:', msg.sender, 'Signal type:', msg.signal?.type);
        try {
        existing.peer.signal(msg.signal);
        } catch (error) {
          console.error('❌ Signal error with peer', msg.sender, ':', error);
          // Remove and recreate peer if signaling fails
          const peerIndex = peersRef.current.findIndex(p => p.id === msg.sender);
          if (peerIndex !== -1) {
            peersRef.current[peerIndex].peer.destroy();
            peersRef.current.splice(peerIndex, 1);
            
            // Create new peer
            const newPeer = createPeer(msg.sender, stream, false);
            peersRef.current.push({ id: msg.sender, peer: newPeer });
            setPeers([...peersRef.current]);
            
            // Retry signaling
            setTimeout(() => {
              try {
                newPeer.signal(msg.signal);
              } catch (retryError) {
                console.error('❌ Retry signal error:', retryError);
              }
            }, 100);
          }
        }
        break;
        
      case 'chat':
        console.log('💬 Chat message from:', msg.sender);
        setMessages((prev) => [...prev, { 
          id: msg.sender, 
          text: msg.text,
          timestamp: new Date().toLocaleTimeString(),
          sender: msg.sender 
        }]);
        break;
        
      case 'draw':
      case 'clear':
        console.log('🎨 Whiteboard action from:', msg.id, msg.type);
        handleRemoteDrawing(msg);
        break;
    }
  };

  /* -------------------------------------------------- */
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          // Toggle microphone
          if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
              setPeers([...peersRef.current || []]);
            }
          }
          e.preventDefault();
          break;
        case 'c':
          // Toggle camera
          if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setPeers([...peersRef.current || []]);
            }
          }
          e.preventDefault();
          break;
        case 'escape':
          // Leave call
          router.push(`/office/${officeId}`);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, officeId]);

  // Activity heartbeat - update activity status every minute
  useEffect(() => {
    if (!activitySessionId) return;

    const heartbeatInterval = setInterval(() => {
      updateActivityHeartbeat(activitySessionId);
      setSessionDuration(prev => prev + 1);
    }, 60000); // Every minute

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [activitySessionId]);

  // Lifecycle
  useEffect(() => {
    if (!roomId || !userName || !user) return;
    
    console.log('🎬 Starting room connection for authenticated user:', {
      roomId,
      userName,
      firebaseUid: user.uid
    });

    // Debug: Check what roomId we actually received
    console.log('🆔 Room ID from router:', roomId);
    console.log('🆔 Current URL:', window.location.href);
    
    // Extract simple room ID if it's a complex one
    let actualRoomId = roomId;
    if (typeof roomId === 'string' && roomId.includes('room-')) {
      const match = roomId.match(/room-(.+)$/);
      if (match) {
        actualRoomId = match[1];
        console.log('🔧 Extracted room ID:', actualRoomId);
      }
    }

    setConnectionStatus('Getting camera access...');
   
    // Check if media devices are available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError('Media devices not supported in this browser.');
      setConnectionStatus('Browser not supported');
      return;
    }
   
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
        
        // Use the corrected room ID for WebSocket connection
        const wsRoomId = actualRoomId;
        console.log('🔗 Using room ID for WebSocket:', wsRoomId);
        
        // Build WebSocket URL with correct room ID
        const getWsUrl = () => {
          if (typeof window === 'undefined') return '';
          
          // Use environment variable for backend URL
          const BACKEND_WEBSOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
          
          if (!BACKEND_WEBSOCKET_URL) {
            console.error('❌ NEXT_PUBLIC_BACKEND_WS_URL environment variable is not set!');
            console.error('❌ Please set NEXT_PUBLIC_BACKEND_WS_URL in your environment');
            
            // Fallback for local development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              const fallbackUrl = 'ws://localhost:8000';
              const url = `${fallbackUrl}/ws/${wsRoomId}`;
              console.log('🔗 Local fallback WebSocket URL:', url);
              return url;
            }
            
            // Fallback for production
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const fallbackUrl = `${protocol}://${window.location.hostname}:8000`;
            const url = `${fallbackUrl}/ws/${wsRoomId}`;
            console.log('🔗 Production fallback WebSocket URL:', url);
            return url;
          }
          
          const url = `${BACKEND_WEBSOCKET_URL}/ws/${wsRoomId}`;
          console.log('🔗 Environment WebSocket URL:', url);
          console.log('🔗 Environment variable value:', BACKEND_WEBSOCKET_URL);
          return url;
        };
        
        const signalingUrl = getWsUrl();
        console.log('🔗 Attempting WebSocket connection to:', signalingUrl);
        const ws = new WebSocket(signalingUrl);
        socketRef.current = ws;

        ws.onopen = async () => {
          console.log('✅ WebSocket connected successfully');
          setIsConnected(true);
          setConnectionStatus('Connected');
          
          // Start activity tracking
          try {
            if (user?.uid && actualRoomId && officeId) {
              const sessionId = await startActivityTracking(
                user.uid,
                officeId,
                actualRoomId,
                userName
              );
              setActivitySessionId(sessionId);
              console.log('✅ Activity tracking started:', sessionId);
            }
          } catch (error) {
            console.error('❌ Failed to start activity tracking:', error);
          }
          
          // Send join message with authenticated user info
          const userInfo = {
            type: 'join', 
            id: myId.current,
            name: userName,
            email: user?.email || '',
            avatar: user?.photoURL || '',
            firebaseUid: user?.uid || '',
            displayName: user?.displayName || userName,
            office_id: officeId || 'default',
            role: isOwner ? 'owner' : 'member'
          };
          
          ws.send(JSON.stringify(userInfo));
          console.log('📤 Sent join message with authenticated user info:', {
            id: userInfo.id,
            name: userInfo.name,
            firebaseUid: userInfo.firebaseUid
          });
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setConnectionStatus('Connection failed');
          setMediaError('Failed to connect to room server. Please check your internet connection and try refreshing the page.');
        };

        ws.onclose = (event) => {
          console.warn('🔌 WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setConnectionStatus('Disconnected');
          
          if (event.code !== 1000) { // Not a normal closure
            if (event.code === 1006) {
              setMediaError('Connection lost unexpectedly. This may be due to media access issues. Please check your camera/microphone permissions and refresh the page.');
            } else {
            setMediaError('Connection lost. Please refresh the page to reconnect.');
            }
          }
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            console.log('📥 Received message:', data.type);
            handleSocketMsg(data, stream);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };
      })
      .catch((err) => {
        console.error('❌ Media error:', err);
        let errorMsg = 'Failed to access camera/microphone. ';
        
        if (err.name === 'NotAllowedError') {
          errorMsg += 'Please allow camera and microphone access.';
        } else if (err.name === 'NotFoundError') {
          errorMsg += 'No camera or microphone found.';
        } else {
          errorMsg += 'Please check your device settings.';
        }
        
        setMediaError(errorMsg);
        setConnectionStatus('Media access failed');
      });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up room connection');
      
      // Stop activity tracking
      if (activitySessionId) {
        stopActivityTracking(activitySessionId).then((duration) => {
          console.log('✅ Activity tracking stopped. Session duration:', duration, 'minutes');
        }).catch((error) => {
          console.error('❌ Failed to stop activity tracking:', error);
        });
      }
      
      // Close WebSocket connection
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Component unmounting');
      }
      
      // Properly destroy all peer connections
      peersRef.current.forEach(({ peer, id }) => {
        console.log('🧹 Destroying peer:', id);
        try {
          if (!peer.destroyed) {
        peer.destroy();
          }
        } catch (error) {
          console.warn('Error destroying peer:', error);
        }
      });
      peersRef.current = [];
      
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('🧹 Stopping track:', track.kind);
          track.stop();
        });
      }
    };
  }, [roomId, userName, user]);

  // Early return if no user to prevent rendering room without authentication
  if (!user) {
    return null;
  }

  // Chat functionality
  const sendMessage = () => {
    if (!newMsg.trim() || !isConnected) return;
    
    const message = {
      type: 'chat',
      id: myId.current,
      text: newMsg.trim(),
      sender: myId.current,
      timestamp: new Date().toISOString()
    };
    
    socketRef.current?.send(JSON.stringify(message));
    
    // Add to local messages
    setMessages(prev => [...prev, { 
      id: myId.current, 
      text: newMsg.trim(),
      timestamp: new Date().toLocaleTimeString(),
      sender: myId.current
    }]);
    
    setNewMsg('');
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    if (!streamRef.current) return;

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setOriginalStream(streamRef.current);
        streamRef.current = screenStream;
        
        if (myVideo.current) {
          myVideo.current.srcObject = screenStream;
        }
        
        // Replace track for all peer connections
        peersRef.current.forEach(({ peer }) => {
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack && (peer as any).streams && (peer as any).streams[0]) {
            (peer as any).replaceTrack((peer as any).streams[0].getVideoTracks()[0], videoTrack, (peer as any).streams[0]);
          }
        });
        
        setIsScreenSharing(true);
        
        // Listen for screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
        
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Screen sharing error:', error);
    }
  };

  const stopScreenShare = async () => {
    if (!originalStream) return;
    
    // Stop screen sharing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Restore original stream
    streamRef.current = originalStream;
    
    if (myVideo.current) {
      myVideo.current.srcObject = originalStream;
    }
    
    // Replace track for all peer connections
    peersRef.current.forEach(({ peer }) => {
      const videoTrack = originalStream.getVideoTracks()[0];
      if (videoTrack && (peer as any).streams && (peer as any).streams[0]) {
        (peer as any).replaceTrack((peer as any).streams[0].getVideoTracks()[0], videoTrack, (peer as any).streams[0]);
      }
    });
    
    setIsScreenSharing(false);
    setOriginalStream(null);
  };

  /* -------------------------------------------------- */
  // UI Components
  const PeerVideo = ({ peer, peerId }: { peer: SimplePeer.Instance; peerId: string }) => {
    const ref = useRef<HTMLVideoElement>(null);
    const [hasStream, setHasStream] = useState(false);
    
    useEffect(() => {
      const handleStream = (stream: MediaStream) => {
        console.log(`📺 ✅ RECEIVED STREAM for peer ${peerId}:`, stream.id);
        console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        console.log('📺 Video element exists:', !!ref.current);
        
        if (ref.current) {
          ref.current.srcObject = stream;
          setHasStream(true);
          
          // Ensure video plays
          ref.current.play().then(() => {
            console.log('📺 ✅ Video playing successfully for peer:', peerId);
          }).catch(e => {
            console.log('📺 ❌ Video autoplay prevented:', e);
          });
        } else {
          console.log('📺 ❌ Video element not available for peer:', peerId);
        }
      };

      // Listen for stream events
      peer.on('stream', handleStream);
      
      // Check if peer already has a stream
      if ((peer as any)._remoteStreams && (peer as any)._remoteStreams.length > 0) {
        handleStream((peer as any)._remoteStreams[0]);
      }

      return () => {
        (peer as any).removeListener('stream', handleStream);
      };
    }, [peer, peerId]);
    
    const participant = participants.find(p => p.id === peerId);
    
    return (
      <div style={{
        position: 'relative',
        aspectRatio: '16/9',
        backgroundColor: '#1A4A3B',
        borderRadius: isMobile ? '12px' : '16px',
        overflow: 'hidden',
        border: `${isMobile ? '1px' : '2px'} solid #0F9D58`,
        boxShadow: isMobile ? '0 2px 10px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.3)',
        width: isMobile ? '100%' : '50%',
        maxWidth: '100%',
        minHeight: isMobile ? '200px' : '300px',
        flex: isMobile ? '0 0 auto' : '1 1 0'
      }}>
        <video 
          ref={ref} 
          autoPlay 
          playsInline
          muted={false}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover'
          }} 
        />
        {!hasStream && (
        <div style={{
          position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#0F9D58',
            color: 'white',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '600'
          }}>
            {(participant?.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          maxWidth: 'calc(100% - 16px)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#0F9D58',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            flexShrink: 0
          }}>
            {(participant?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {participant?.name?.split(' ')[0] || 'Unknown'}
          </span>
        </div>
      </div>
    );
  };

  /* -------------------------------------------------- */
  // Render

  // Show loading screen while checking authentication
  if (isAuthChecking) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F1419',
        color: 'white',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '4px solid rgba(255,255,255,0.2)',
          borderTop: '4px solid #0052CC',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px'
        }} />
        <h2 style={{ fontSize: '24px', margin: 0 }}>Checking Authentication...</h2>
        <p style={{ fontSize: '16px', opacity: 0.7 }}>Please wait</p>
      </div>
    );
  }

  if (mediaError) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F1419',
        color: 'white',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px' }}>🎥</div>
        <h2 style={{ fontSize: '24px', margin: 0 }}>Media Access Required</h2>
        <p style={{ fontSize: '16px', maxWidth: '400px', lineHeight: '1.5' }}>{mediaError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0052CC',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0F2027',
      color: 'white',
      fontFamily: '"Google Sans", Roboto, Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? '4px 16px' : '12px 24px',
        backgroundColor: '#1F1F1F',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        minHeight: isMobile ? '48px' : '64px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: isMobile ? '16px' : '24px',
            fontWeight: '400',
            color: '#E8EAED',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {(() => {
              // Extract simple room name from complex ID
              let displayRoomId = roomId;
              if (roomId && roomId.includes('room-')) {
                const parts = roomId.split('room-');
                if (parts.length > 1) {
                  displayRoomId = parts[parts.length - 1];
                }
              }
              
              // Map common room IDs to friendly names
              const roomNames: { [key: string]: string } = {
                'main-hall': 'Main Hall',
                'meeting-room-1': 'Meeting Room 1',
                'meeting-room-2': 'Meeting Room 2', 
                'breakout-room': 'Breakout Room'
              };
              
              const friendlyName = roomNames[displayRoomId] || displayRoomId;
              
              return isMobile 
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | ${friendlyName}`;
            })()}
          </div>
          {isMobile && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: isConnected ? '#0F9D58' : '#DB4437',
              color: 'white',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'white'
              }} />
              {participants.length + 1}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '8px'
        }}>
          {!isMobile && (
          <div style={{ 
            padding: '6px 12px', 
              backgroundColor: isConnected ? '#0F9D58' : '#DB4437',
            color: 'white',
              borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
                width: '6px',
                height: '6px',
              borderRadius: '50%',
              backgroundColor: 'white'
            }} />
            {connectionStatus}
          </div>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => router.push(`/office/${officeId}`)}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  backgroundColor: '#6B46C1',
                  color: 'white',
                  border: 'none',
                  borderRadius: isMobile ? '16px' : '20px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '4px' : '6px',
                  marginRight: isMobile ? '4px' : '8px'
                }}
              >
                🏢 {isMobile ? '' : 'Office'}
              </button>

            </>
          )}

          {/* Profile Button */}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '50%',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: isMobile ? '4px' : '8px'
            }}
            title="View Profile"
          >
            S
          </button>


        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0F2027'
      }}>
        {/* Video Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: isMobile ? '12px 8px 100px 8px' : '20px 20px 120px 20px',
          gap: isMobile ? '12px' : '16px',
          overflowY: isMobile ? 'auto' : 'hidden'
        }}>
          {!showWhiteboard ? (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px',
              width: '100%',
              height: isMobile ? 'auto' : '100%',
              maxWidth: '100%',
              justifyContent: 'center',
              alignItems: isMobile ? 'stretch' : 'stretch'
            }}>
              {/* My Video */}
              <div style={{
                position: 'relative',
                aspectRatio: '16/9',
                backgroundColor: '#1A4A3B',
                borderRadius: isMobile ? '12px' : '16px',
                overflow: 'hidden',
                border: `${isMobile ? '1px' : '2px'} solid #0F9D58`,
                boxShadow: isMobile ? '0 2px 10px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.3)',
                width: isMobile ? '100%' : '50%',
                maxWidth: '100%',
                minHeight: isMobile ? '200px' : '300px',
                flex: isMobile ? '0 0 auto' : '1 1 0'
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
                  bottom: isMobile ? '8px' : '16px',
                  left: isMobile ? '8px' : '16px',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                  borderRadius: isMobile ? '16px' : '20px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '4px' : '6px',
                  maxWidth: isMobile ? 'calc(100% - 16px)' : 'auto'
                }}>
                  <div style={{
                    width: isMobile ? '24px' : '32px',
                    height: isMobile ? '24px' : '32px',
                    borderRadius: '50%',
                    backgroundColor: '#0F9D58',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '12px' : '16px',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {isMobile ? userName.split(' ')[0] : userName} {isScreenSharing ? '(Screen)' : ''}
                  </span>
                </div>
                {!streamRef.current?.getVideoTracks()[0]?.enabled && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: '#0F9D58',
                    color: 'white',
                    width: isMobile ? '60px' : '80px',
                    height: isMobile ? '60px' : '80px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '24px' : '36px',
                    fontWeight: '600'
                  }}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Other participants */}
              {peers.map(({ id, peer }) => {
                console.log('🎥 Rendering peer video for:', id);
                return <PeerVideo key={id} peer={peer} peerId={id} />;
              })}
              
              {/* Connection status for participants without peers */}
              {participants.length > 1 && peers.length === 0 && (
                <div style={{
                  aspectRatio: '16/9',
                  backgroundColor: '#1A4A3B',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  border: '2px solid #0F9D58',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#0F9D58',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '16px'
                  }}>
                    🔄
                  </div>
                  <p style={{ 
                    color: 'white', 
                    fontSize: '16px',
                    fontWeight: '500',
                    margin: '0 0 8px 0'
                  }}>
                    Connecting to participants...
                  </p>
                  <p style={{ 
                    color: '#B0BEC5', 
                    fontSize: '14px',
                    margin: 0 
                  }}>
                    {participants.filter(p => p.id !== myId.current).map(p => p.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Whiteboard */
            <div style={{ 
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'crosshair'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                onClick={clearWhiteboard}
                style={{
                  position: 'absolute',
                  top: '30px',
                  right: '30px',
                  padding: '8px 16px',
                  backgroundColor: '#d93025',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
        <div style={{
            position: isMobile ? 'fixed' : 'relative',
            top: isMobile ? '0' : 'auto',
            left: isMobile ? '0' : 'auto',
            right: isMobile ? '0' : 'auto',
            bottom: isMobile ? '0' : 'auto',
            width: isMobile ? '100%' : '300px',
            height: isMobile ? '100vh' : 'auto',
          backgroundColor: '#202124',
            borderLeft: isMobile ? 'none' : '1px solid #5f6368',
          display: 'flex',
            flexDirection: 'column',
            zIndex: isMobile ? 1000 : 'auto'
        }}>
          <div style={{
              padding: isMobile ? '16px 16px 12px 16px' : '16px',
            borderBottom: '1px solid #5f6368',
            fontWeight: '600',
              fontSize: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Chat</span>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
          </div>
          
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                padding: '8px 12px',
                  backgroundColor: msg.sender === myId.current ? '#0F9D58' : '#3c4043',
                borderRadius: '12px',
                fontSize: '14px',
                wordBreak: 'break-word'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                  {msg.sender === myId.current ? 'You' : (participants.find(p => p.id === msg.sender)?.name || 'Unknown')}
                </div>
                <div>{msg.text}</div>
                {msg.timestamp && (
                  <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    {msg.timestamp}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{
            padding: '16px',
            borderTop: '1px solid #5f6368',
            display: 'flex',
              gap: '8px',
              paddingBottom: isMobile ? '24px' : '16px'
          }}>
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              style={{
                flex: 1,
                  padding: '12px',
                backgroundColor: '#3c4043',
                border: '1px solid #5f6368',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              style={{
                  padding: '12px 16px',
                  backgroundColor: newMsg.trim() ? '#0F9D58' : '#5f6368',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: newMsg.trim() ? 'pointer' : 'not-allowed',
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

      {/* Professional Bottom Control Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: isMobile 
          ? 'linear-gradient(180deg, rgba(32, 33, 36, 0) 0%, rgba(32, 33, 36, 0.8) 20%, rgba(32, 33, 36, 0.95) 100%)'
          : 'rgba(32, 33, 36, 0.95)',
        backdropFilter: isMobile ? 'blur(20px)' : 'none',
        padding: isMobile ? '12px 20px 28px 20px' : '12px 40px 20px 40px',
        zIndex: 100
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          gap: isMobile ? '12px' : '12px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {/* Left Controls Group */}
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '10px' }}>
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
                width: isMobile ? '52px' : '48px',
                height: isMobile ? '52px' : '48px',
              borderRadius: '50%',
                backgroundColor: streamRef.current?.getAudioTracks()[0]?.enabled !== false ? 'rgba(255, 255, 255, 0.1)' : '#EA4335',
                border: `2px solid ${streamRef.current?.getAudioTracks()[0]?.enabled !== false ? 'rgba(255, 255, 255, 0.2)' : '#EA4335'}`,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                outline: 'none',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              title={streamRef.current?.getAudioTracks()[0]?.enabled !== false ? 'Mute microphone (m)' : 'Unmute microphone (m)'}
            >
              <svg width={isMobile ? "24" : "18"} height={isMobile ? "24" : "18"} viewBox="0 0 24 24" fill="currentColor">
                {streamRef.current?.getAudioTracks()[0]?.enabled !== false ? (
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                ) : (
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                )}
              </svg>
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
                width: isMobile ? '52px' : '48px',
                height: isMobile ? '52px' : '48px',
              borderRadius: '50%',
                backgroundColor: streamRef.current?.getVideoTracks()[0]?.enabled !== false ? 'rgba(255, 255, 255, 0.1)' : '#EA4335',
                border: `2px solid ${streamRef.current?.getVideoTracks()[0]?.enabled !== false ? 'rgba(255, 255, 255, 0.2)' : '#EA4335'}`,
              color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                outline: 'none',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              title={streamRef.current?.getVideoTracks()[0]?.enabled !== false ? 'Turn off camera (c)' : 'Turn on camera (c)'}
            >
              <svg width={isMobile ? "24" : "18"} height={isMobile ? "24" : "18"} viewBox="0 0 24 24" fill="currentColor">
                {streamRef.current?.getVideoTracks()[0]?.enabled !== false ? (
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                ) : (
                  <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/>
                )}
              </svg>
            </button>
          </div>

          {/* Center - End Call Button */}
          <button 
            onClick={() => router.push(`/office/${officeId}`)}
                          style={{
                width: isMobile ? '56px' : '52px',
                height: isMobile ? '56px' : '52px',
              borderRadius: '50%',
              backgroundColor: '#EA4335',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 16px rgba(234, 67, 53, 0.4)',
              outline: 'none',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(234, 67, 53, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(234, 67, 53, 0.4)';
            }}
            title="Leave call"
          >
            <svg width={isMobile ? "26" : "20"} height={isMobile ? "26" : "20"} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>

          {/* Right Controls Group */}
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '10px' }}>
          {/* Screen Share */}
            {!isMobile && (
          <button 
            onClick={toggleScreenShare}
            disabled={!streamRef.current}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
                  backgroundColor: isScreenSharing ? '#1976D2' : 'rgba(255, 255, 255, 0.1)',
                  border: `2px solid ${isScreenSharing ? '#1976D2' : 'rgba(255, 255, 255, 0.2)'}`,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  outline: 'none',
                  transform: 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                title={isScreenSharing ? 'Stop sharing' : 'Present now'}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                </svg>
          </button>
            )}

            {/* Chat */}
            <button 
              onClick={() => setShowChat(!showChat)}
                              style={{
                  width: isMobile ? '52px' : '48px',
                  height: isMobile ? '52px' : '48px',
                  borderRadius: '50%',
                  backgroundColor: showChat ? '#1976D2' : 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${showChat ? '#1976D2' : 'rgba(255, 255, 255, 0.2)'}`,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                outline: 'none',
                transform: 'scale(1)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              title="Toggle chat"
            >
              <svg width={isMobile ? "24" : "18"} height={isMobile ? "24" : "18"} viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              {messages.length > 0 && !showChat && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#EA4335',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {messages.length > 9 ? '9+' : messages.length}
                </div>
              )}
            </button>

            {/* More Options */}
          <button 
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            style={{
                width: isMobile ? '52px' : '48px',
                height: isMobile ? '52px' : '48px',
              borderRadius: '50%',
                backgroundColor: showWhiteboard ? '#8E24AA' : 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${showWhiteboard ? '#8E24AA' : 'rgba(255, 255, 255, 0.2)'}`,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                outline: 'none',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              title={showWhiteboard ? 'Hide whiteboard' : 'Open whiteboard'}
            >
              <svg width={isMobile ? "24" : "18"} height={isMobile ? "24" : "18"} viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 5v2h-3v3h-2V7h-3V5h3V2h2v3h3zM6 7h9v2H6V7zm0 4h9v2H6v-2zm0 4h6v2H6v-2zm10-1.5V14h3v-2h-3v-.5zM4 2H2v18l4-4h14c1.1 0 2-.9 2-2V5h-2v9H6.17L4 16.17V2z"/>
              </svg>
          </button>
        </div>
      </div>

        {/* Connection Status */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#0F9D58' : '#EA4335'
          }} />
          {connectionStatus}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <ProfilePage 
          user={user}
          userName={userName}
          sessionStartTime={sessionStartTime}
          officeId={officeId || 'default'}
          isOwner={isOwner}
          onClose={() => setShowProfile(false)}
          isMobile={isMobile}
        />
      )}

      {/* Office Dashboard Modal */}
      {showDashboard && (
        <OfficeDashboard 
          officeId={officeId || 'default'}
          onClose={() => setShowDashboard(false)}
          currentRoomId={roomId}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

// Office Dashboard Component
const OfficeDashboard = ({ officeId, onClose, currentRoomId, isMobile }: {
  officeId: string;
  onClose: () => void;
  currentRoomId: string;
  isMobile: boolean;
}) => {
  const [officeData, setOfficeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOfficeData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'http://localhost:8000';
        const wsUrl = baseUrl.replace('wss:', 'https:').replace('ws:', 'http:');
        
        const apiUrl = `${wsUrl}/offices/${officeId}/participants`;
        console.log('📊 Fetching office data from:', apiUrl);
        console.log('📊 Environment variable value:', process.env.NEXT_PUBLIC_BACKEND_WS_URL);
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        setOfficeData(data);
        console.log('📊 Dashboard data received:', data);
      } catch (error) {
        console.error('❌ Failed to fetch office data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOfficeData();
    
    // Refresh every 3 seconds for real-time feel
    const interval = setInterval(fetchOfficeData, 3000);
    return () => clearInterval(interval);
  }, [officeId]);

  const getRoomName = (roomId: string) => {
    const roomNames: { [key: string]: string } = {
      'main-hall': 'Main Hall',
      'meeting-room-1': 'Meeting Room 1',
      'meeting-room-2': 'Meeting Room 2',
      'breakout-room': 'Breakout Room'
    };
    return roomNames[roomId] || roomId;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(10px)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '800px',
        maxHeight: '90vh',
        backgroundColor: '#1F1F1F',
        borderRadius: '16px',
        border: '1px solid #333',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '700',
              color: '#0F9D58',
              margin: 0
            }}>
              Office Dashboard
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              margin: '4px 0 0 0'
            }}>
              Real-time participant overview
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                onClose();
                window.open(`/office/${officeId}`, '_blank');
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6B46C1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🏢 {isMobile ? '' : 'Office View'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#DB4437',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(255,255,255,0.2)',
                borderTop: '4px solid #0F9D58',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading office data...</p>
            </div>
          ) : officeData ? (
            <div>
              {/* Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#0F9D58',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>
                    {officeData.total_participants}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
                    Total Online
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#00875A',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>
                    {officeData.active_rooms}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
                    Active Rooms
                  </div>
                </div>
                {!isMobile && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#BF2600',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>
                      {Object.keys(officeData.rooms).length}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
                      Total Rooms
                    </div>
                  </div>
                )}
              </div>

              {/* Rooms */}
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white',
                margin: '0 0 16px 0'
              }}>
                Room Participants
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {(Object.entries(officeData.rooms as Record<string, any[]>)).map(([roomId, participants]) => (
                  <div
                    key={roomId}
                    style={{
                      padding: '16px',
                      backgroundColor: roomId === currentRoomId ? 'rgba(15, 157, 88, 0.2)' : '#2A2A2A',
                      borderRadius: '12px',
                      border: roomId === currentRoomId ? '1px solid #0F9D58' : '1px solid #444'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: participants.length > 0 ? '12px' : '0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'white',
                          margin: 0
                        }}>
                          {getRoomName(roomId)}
                        </h4>
                        {roomId === currentRoomId && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#0F9D58',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            CURRENT
                          </span>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: participants.length > 0 ? '#0F9D58' : '#666',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {participants.length}
                      </span>
                    </div>

                    {participants.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {participants.map((participant: any) => (
                          <div
                            key={participant.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '16px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: participant.role === 'owner' ? '#BF2600' : '#0F9D58',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '600',
                              color: 'white'
                            }}>
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ color: 'white', fontWeight: '500' }}>
                              {participant.name}
                            </span>
                            {participant.role === 'owner' && (
                              <span style={{
                                fontSize: '10px',
                                color: '#BF2600',
                                fontWeight: '600'
                              }}>
                                OWNER
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)',
              padding: '40px'
            }}>
              Failed to load office data
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Profile Page Component
const ProfilePage = ({ user, userName, sessionStartTime, officeId, isOwner, onClose, isMobile }: {
  user: any;
  userName: string;
  sessionStartTime: Date;
  officeId: string;
  isOwner: boolean;
  onClose: () => void;
  isMobile: boolean;
}) => {
  const [activeTime, setActiveTime] = useState(0);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate active time
  useEffect(() => {
    const updateActiveTime = () => {
      const now = new Date();
      const diffMs = now.getTime() - sessionStartTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      setActiveTime(diffMinutes);
    };

    updateActiveTime();
    const interval = setInterval(updateActiveTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Fetch employee stats for admin
  useEffect(() => {
    if (isOwner) {
      const fetchEmployeeStats = async () => {
        setLoading(true);
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'http://localhost:8000';
          const wsUrl = baseUrl.replace('wss:', 'https:').replace('ws:', 'http:');
          
          const apiUrl = `${wsUrl}/offices/${officeId}/employee-stats`;
          console.log('👥 Fetching employee stats from:', apiUrl);
          console.log('👥 Environment variable value:', process.env.NEXT_PUBLIC_BACKEND_WS_URL);
          
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            setEmployeeStats(data.employees || []);
            console.log('👥 Employee stats received:', data);
          } else {
            console.error('❌ Failed to fetch employee stats:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('❌ Failed to fetch employee stats:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchEmployeeStats();
    }
  }, [isOwner, officeId]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '20px' : '40px'
    }}>
      <div style={{
        backgroundColor: '#1F1F1F',
        borderRadius: '16px',
        padding: isMobile ? '24px' : '32px',
        maxWidth: isMobile ? '100%' : '600px',
        width: '100%',
        maxHeight: isMobile ? '100%' : '80vh',
        overflowY: 'auto',
        color: 'white',
        fontFamily: '"Google Sans", Roboto, Arial, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #333'
        }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            margin: 0,
            color: '#E8EAED'
          }}>
            Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* User Info Section */}
        <div style={{
          backgroundColor: '#2A2A2A',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#4285F4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '600',
              color: 'white'
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: '#E8EAED'
              }}>
                {userName}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#9AA0A6',
                margin: 0
              }}>
                {user?.email}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: isOwner ? '#6B46C1' : '#0F9D58',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {isOwner ? 'OWNER' : 'MEMBER'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#0F9D58',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white'
              }}>
                {formatTime(activeTime)}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.9)'
              }}>
                Active Today
              </div>
            </div>
            <div style={{
              padding: '12px',
              backgroundColor: '#1976D2',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'white'
              }}>
                {formatDate(new Date())}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.9)'
              }}>
                Session Started
              </div>
            </div>
          </div>
        </div>

        {/* Office Info */}
        <div style={{
          backgroundColor: '#2A2A2A',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: isOwner ? '20px' : '0'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: '#E8EAED'
          }}>
            Office Information
          </h4>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid #444'
          }}>
            <span style={{ color: '#9AA0A6' }}>Office ID</span>
            <span style={{ color: 'white', fontWeight: '500' }}>{officeId}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0'
          }}>
            <span style={{ color: '#9AA0A6' }}>Role</span>
            <span style={{ color: 'white', fontWeight: '500' }}>
              {isOwner ? 'Office Owner' : 'Team Member'}
            </span>
          </div>
        </div>

        {/* Employee Stats Section (Admin Only) */}
        {isOwner && (
          <div style={{
            backgroundColor: '#2A2A2A',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 16px 0',
              color: '#E8EAED'
            }}>
              Employee Activity
            </h4>
            
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#9AA0A6'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(255,255,255,0.2)',
                  borderTop: '3px solid #0F9D58',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }} />
                Loading employee data...
              </div>
            ) : employeeStats.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {employeeStats.map((employee: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      backgroundColor: '#3A3A3A',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#4285F4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'white'
                        }}>
                          {employee.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#9AA0A6'
                        }}>
                          {employee.email}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      textAlign: 'right'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0F9D58'
                      }}>
                        {formatTime(employee.activeMinutes || 0)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#9AA0A6'
                      }}>
                        Active time
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#9AA0A6'
              }}>
                No employee data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

 