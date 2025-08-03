import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../context/AuthContext';
import { db, createJoinRequest, subscribeToJoinRequests, updateJoinRequestStatus, deleteJoinRequest, sendOfficeInvitation, type JoinRequest, type OfficeInvitation } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface Room {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  participants: number;
  maxParticipants: number;
  isCustom: boolean;
}

interface Office {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  rooms: Room[];
  isPublic: boolean;
  settings: {
    maxParticipants: number;
    allowGuests: boolean;
    requireApproval: boolean;
  };
}

const defaultRooms: Room[] = [
  {
    id: 'main-hall',
    name: 'Main Hall',
    description: 'Welcome area for all participants',
    color: '#0052CC',
    icon: '🏛️',
    position: { x: 40, y: 15 },
    size: { width: 20, height: 15 },
    participants: 0,
    maxParticipants: 20,
    isCustom: false
  },
  {
    id: 'meeting-room-1',
    name: 'Meeting Room 1',
    description: 'Private meeting space',
    color: '#00875A',
    icon: '📋',
    position: { x: 10, y: 45 },
    size: { width: 18, height: 12 },
    participants: 0,
    maxParticipants: 8,
    isCustom: false
  },
  {
    id: 'meeting-room-2',
    name: 'Meeting Room 2',
    description: 'Collaborative workspace',
    color: '#BF2600',
    icon: '💼',
    position: { x: 70, y: 45 },
    size: { width: 18, height: 12 },
    participants: 0,
    maxParticipants: 8,
    isCustom: false
  },
  {
    id: 'breakout-room',
    name: 'Breakout Room',
    description: 'Casual discussion area',
    color: '#6B46C1',
    icon: '☕',
    position: { x: 40, y: 70 },
    size: { width: 20, height: 12 },
    participants: 0,
    maxParticipants: 6,
    isCustom: false
  }
];

const roomColors = ['#0052CC', '#00875A', '#BF2600', '#6B46C1', '#DC2626', '#059669', '#7C2D12'];
const roomIcons = ['📋', '💼', '🎯', '☕', '💡', '🎨', '📊', '🔬', '⚡', '🚀'];

export default function Office() {
  const router = useRouter();
  const { officeId } = router.query as { officeId: string };
  const { user } = useAuth();

  // State
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Room interaction
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [userName, setUserName] = useState('');
  const [isEntering, setIsEntering] = useState(false);

  // Office management
  const [showSettings, setShowSettings] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Office settings form
  const [officeSettings, setOfficeSettings] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxParticipants: 50,
    allowGuests: true,
    requireApproval: false
  });

  // New room form
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    color: roomColors[0],
    icon: roomIcons[0],
    maxParticipants: 8,
    position: { x: 20, y: 20 },
    size: { width: 15, height: 12 }
  });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-fill user name
  useEffect(() => {
    if (user?.displayName) {
      setUserName(user.displayName);
    }
  }, [user]);

  // Load office and set up real-time updates
  useEffect(() => {
    if (!officeId || !user) return;

    const loadOffice = async () => {
      try {
        setError('');
        const officeRef = doc(db, 'offices', officeId);
        const officeSnap = await getDoc(officeRef);

        if (officeSnap.exists()) {
          const officeData = officeSnap.data() as Office;
          setOffice(officeData);
          setIsOwner(officeData.ownerId === user.uid);
          setOfficeSettings({
            name: officeData.name,
            description: officeData.description,
            isPublic: officeData.isPublic,
            maxParticipants: officeData.settings.maxParticipants,
            allowGuests: officeData.settings.allowGuests,
            requireApproval: officeData.settings.requireApproval
          });
        } else {
          // Create new office
          const newOffice: Office = {
            id: officeId,
            name: localStorage.getItem('officeName') || 'My Office',
            description: 'A collaborative workspace for teams',
            ownerId: user.uid,
            ownerName: user.displayName || user.email || 'Unknown',
            createdAt: new Date().toISOString(),
            rooms: defaultRooms,
            isPublic: true,
            settings: {
              maxParticipants: 50,
              allowGuests: true,
              requireApproval: true // Default to requiring approval
            }
          };

          await setDoc(officeRef, newOffice);
          setOffice(newOffice);
          setIsOwner(true);
          setOfficeSettings({
            name: newOffice.name,
            description: newOffice.description,
            isPublic: newOffice.isPublic,
            maxParticipants: newOffice.settings.maxParticipants,
            allowGuests: newOffice.settings.allowGuests,
            requireApproval: newOffice.settings.requireApproval
          });
        }
      } catch (error) {
        console.error('Error loading office:', error);
        setError('Failed to load office. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadOffice();

    // Real-time updates
    const officeRef = doc(db, 'offices', officeId);
    const unsubscribe = onSnapshot(officeRef, (doc) => {
      if (doc.exists()) {
        const officeData = doc.data() as Office;
        setOffice(officeData);
      }
    }, (error) => {
      console.error('Real-time update error:', error);
      setError('Connection lost. Please refresh the page.');
    });

    return () => unsubscribe();
  }, [officeId, user]);

  // Subscribe to join requests (for owners)
  useEffect(() => {
    if (!user || !isOwner) return;

    const unsubscribe = subscribeToJoinRequests(user.uid, (requests) => {
      setJoinRequests(requests);
    });

    return () => unsubscribe();
  }, [user, isOwner]);

  const updateOffice = async (updates: Partial<Office>) => {
    if (!office || !user || !isOwner) return false;

    try {
      const officeRef = doc(db, 'offices', officeId);
      await updateDoc(officeRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating office:', error);
      setError('Failed to update office settings.');
      return false;
    }
  };

  const saveOfficeSettings = async () => {
    if (!office) return;

    const updates = {
      name: officeSettings.name,
      description: officeSettings.description,
      isPublic: officeSettings.isPublic,
      settings: {
        maxParticipants: officeSettings.maxParticipants,
        allowGuests: officeSettings.allowGuests,
        requireApproval: officeSettings.requireApproval
      }
    };

    const success = await updateOffice(updates);
    if (success) {
      setShowSettings(false);
    }
  };

  const handleRoomClick = async (roomId: string) => {
    if (!office || !user) return;

    const room = office.rooms.find(r => r.id === roomId);
    if (!room) return;

    // If office requires approval and user is not owner, create join request
    if (office.settings.requireApproval && !isOwner) {
      try {
        const requestId = await createJoinRequest({
          userId: user.uid,
          userName: user.displayName || user.email || 'Unknown User',
          userEmail: user.email || '',
          userPhoto: user.photoURL || '',
          officeId: office.id,
          officeName: office.name,
          ownerId: office.ownerId
        });
        setPendingJoinRequest(requestId);
        return;
      } catch (error) {
        console.error('Error creating join request:', error);
        setError('Failed to request access. Please try again.');
        return;
      }
    }

    setSelectedRoom(roomId);
    setShowNameInput(true);
  };

  const joinRoom = async () => {
    if (!userName.trim() || !selectedRoom || !office || !user) return;
    
    setIsEntering(true);
    localStorage.setItem('userName', userName.trim());
    
    // Store office context for the room
    localStorage.setItem('currentOfficeId', office.id);
    if (isOwner) {
      localStorage.setItem(`office_${office.id}_owner`, user.uid);
    }
    
    try {
      // Track room joining
      const selectedRoomData = office.rooms.find(r => r.id === selectedRoom);
      if (selectedRoomData) {
        const { joinRoom: trackJoinRoom } = await import('../../lib/firebase');
        await trackJoinRoom(
          user.uid,
          selectedRoom,
          selectedRoomData.name,
          office.id,
          office.name,
          isOwner ? 'owner' : 'member'
        );
      }
    } catch (error) {
      console.error('Error tracking room join:', error);
    }
    
    setTimeout(() => {
      router.push(`/room/${selectedRoom}?officeId=${office.id}`);
    }, 1000);
  };

  const handleJoinRequestAction = async (requestId: string, action: 'approve' | 'deny') => {
    try {
      await updateJoinRequestStatus(requestId, action === 'approve' ? 'approved' : 'denied');
      
      if (action === 'approve') {
        // Additional logic for approved users can be added here
        console.log('User approved for office access');
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      setError('Failed to process join request.');
    }
  };

  const sendInvitation = async (email: string, message?: string) => {
    if (!office || !user) return;
    
    try {
      const { sendEmailInvitation } = await import('../../lib/firebase');
      await sendEmailInvitation(
        office.id,
        office.rooms[0]?.id || 'main-hall',
        user.uid,
        user.displayName || 'Unknown User',
        user.email || '',
        email,
        message
      );
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation. Please try again.');
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim() || !office || !user) return;
    
    setInviteLoading(true);
    setInviteError(''); // Clear any previous errors
    
    try {
      // Import Firebase functions
      const { sendOfficeInvitation } = await import('../../lib/firebase');
      
      // Send invitation through Firestore
      await sendOfficeInvitation({
        officeId: office.id,
        officeName: office.name,
        inviterUid: user.uid,
        inviterName: user.displayName || user.email || 'Unknown User',
        inviterEmail: user.email || '',
        inviteeEmail: inviteEmail.trim(),
        message: inviteMessage.trim(),
        createdAt: new Date().toISOString()
      });
      
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}. They will see it in their dashboard.`);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteMessage('');
        setInviteSuccess('');
        setInviteError('');
      }, 3000);
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setInviteError(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const getRoomStyle = (room: Room) => ({
    position: 'absolute' as const,
    left: `${room.position.x}%`,
    top: `${room.position.y}%`,
    width: `${room.size.width}%`,
    height: `${room.size.height}%`,
    backgroundColor: hoveredRoom === room.id ? '#FFFFFF' : '#F8FAFC',
    border: `2px solid ${hoveredRoom === room.id ? room.color : '#E2E8F0'}`,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: hoveredRoom === room.id ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: hoveredRoom === room.id 
      ? `0 8px 25px -5px ${room.color}40, 0 4px 10px -3px ${room.color}20`
      : `0 2px 8px -2px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)`,
  });

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        color: 'white',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTop: '4px solid #0052CC',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <p style={{ fontSize: '20px', margin: 0, fontWeight: '600' }}>Loading your office...</p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.7 }}>Setting up workspace</p>
        </div>
      </div>
    );
  }

  if (!office) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        color: 'white',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <h1 style={{ fontSize: '72px', margin: '0 0 24px 0' }}>🏢</h1>
          <h2 style={{ fontSize: '24px', margin: '0 0 16px 0', fontWeight: '700' }}>Office Not Found</h2>
          <p style={{ fontSize: '16px', margin: '0 0 32px 0', opacity: 0.8, lineHeight: '1.5' }}>
            The office you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '16px 32px',
              background: '#0065FF',
              color: 'white',
              border: 'none',
              borderRadius: '28px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{office.name} - Enterprise Virtual Office</title>
        <meta name="description" content={office.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#1e293b',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header */}
        <header style={{
          padding: isMobile ? '16px 20px' : '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => router.push('/')}
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
                transition: 'all 0.3s ease'
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
              <span style={{ fontSize: isMobile ? '16px' : '18px' }}>←</span>
              {!isMobile && 'Back to Home'}
            </button>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? '20px' : '28px',
                fontWeight: '800',
                color: 'white',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {office.name}
              </h1>
              <p style={{
                fontSize: isMobile ? '13px' : '15px',
                color: 'rgba(255,255,255,0.7)',
                margin: '4px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: '500'
              }}>
                {office.description} • {isOwner ? 'Owner' : 'Guest'}
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '8px' : '16px',
            flexWrap: 'wrap'
          }}>
            {/* Invite Button for Owners */}
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease',
                  marginRight: isMobile ? '4px' : '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 157, 88, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '16px' }}>📧</span>
                {!isMobile && 'Invite User'}
              </button>
            )}

            {/* Join Requests Badge */}
            {isOwner && joinRequests.length > 0 && (
              <button
                onClick={() => setShowJoinRequests(true)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>📋</span>
                {!isMobile && `${joinRequests.length} Request${joinRequests.length !== 1 ? 's' : ''}`}
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#FBBF24',
                  color: '#92400E',
                  borderRadius: '50%',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {joinRequests.length}
                </div>
              </button>
            )}



            {isOwner && (
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.3s ease'
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
                <span style={{ fontSize: '16px' }}>⚙️</span>
                {!isMobile && 'Settings'}
              </button>
            )}
          </div>
        </header>

        {/* Professional Office Layout */}
        <div style={{
          padding: isMobile ? '16px' : '32px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1400px',
            height: isMobile ? '60vh' : '75vh',
            minHeight: '500px',
            background: '#E2E8F0',
            borderRadius: '16px',
            border: '2px solid #CBD5E1',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden'
          }}>
            {/* Professional grid pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'none',
              backgroundSize: '40px 40px',
              opacity: 0.5
            }} />

            {/* Rooms */}
            {office.rooms.map((room) => (
              <div
                key={room.id}
                style={getRoomStyle(room)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onClick={() => handleRoomClick(room.id)}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: room.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {room.icon}
                </div>
                <h3 style={{
                  color: hoveredRoom === room.id ? room.color : '#1E293B',
                  margin: '0 0 6px 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: '-0.025em'
                }}>
                  {room.name}
                </h3>
                <p style={{
                  color: hoveredRoom === room.id ? '#64748B' : '#64748B',
                  margin: '0 0 12px 0',
                  fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                  textAlign: 'center',
                  fontWeight: '500',
                  padding: '0 8px',
                  lineHeight: '1.3'
                }}>
                  {room.description}
                </p>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: hoveredRoom === room.id ? room.color : '#F1F5F9',
                  color: hoveredRoom === room.id ? 'white' : '#475569',
                  borderRadius: '16px',
                  fontSize: 'clamp(0.7rem, 1.2vw, 0.8rem)',
                  fontWeight: '600',
                  border: `1px solid ${hoveredRoom === room.id ? room.color : '#E2E8F0'}`
                }}>
                  {room.participants}/{room.maxParticipants} participants
                </div>
              </div>
            ))}

            {/* Add Room Button (Owner only) */}
            {isOwner && (
              <button
                onClick={() => setShowAddRoom(true)}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  padding: '12px 20px',
                  background: '#0052CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0, 82, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 204, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 82, 204, 0.3)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Room
              </button>
            )}
          </div>
        </div>

        {/* Pending Join Request Alert */}
        {pendingJoinRequest && (
          <div style={{
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 82, 204, 0.95)',
            color: 'white',
            padding: '20px 32px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: '600',
            textAlign: 'center',
            zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgba(0, 82, 204, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            maxWidth: '90%'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            Access request sent to office owner
            <br />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              You'll be notified when approved
            </span>
          </div>
        )}

        {/* Continue with rest of modals and components... */}
        {/* For brevity, I'll add the key modals but not all of them */}

        {/* Success Toast */}
        {copySuccess && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#059669',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            Invitation sent successfully!
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(220, 38, 38, 0.95)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 1000,
            maxWidth: '90%',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            {error}
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                marginLeft: '8px',
                padding: '0 4px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Join Requests Modal (Owner only) */}
        {showJoinRequests && isOwner && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(10px)',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '32px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                  Join Requests
                </h2>
                <button
                  onClick={() => setShowJoinRequests(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#64748B'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {joinRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <p style={{ fontSize: '16px', margin: 0 }}>No pending join requests</p>
                  </div>
                ) : (
                  joinRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '20px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <img
                        src={request.userPhoto || ''}
                        alt={request.userName}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          backgroundColor: '#E2E8F0'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', color: '#0F172A' }}>
                          {request.userName}
                        </h4>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                          {request.userEmail}
                        </p>
                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0 0' }}>
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleJoinRequestAction(request.id, 'approve')}
                          style={{
                            padding: '8px 16px',
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleJoinRequestAction(request.id, 'deny')}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            border: '1px solid #D1D5DB',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          ✗ Deny
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Room Entry Modal */}
        {showNameInput && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '40px',
              width: '100%',
              maxWidth: '480px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              transform: isEntering ? 'scale(0.95) rotateX(5deg)' : 'scale(1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {!isEntering ? (
                <>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                    {office.rooms.find(r => r.id === selectedRoom)?.icon}
                  </div>
                  <h2 style={{
                    color: office.rooms.find(r => r.id === selectedRoom)?.color,
                    margin: '0 0 12px 0',
                    fontSize: '28px',
                    fontWeight: '800'
                  }}>
                    Joining {office.rooms.find(r => r.id === selectedRoom)?.name}
                  </h2>
                  <p style={{
                    color: '#64748B',
                    margin: '0 0 32px 0',
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}>
                    {office.rooms.find(r => r.id === selectedRoom)?.description}
                  </p>
                  <input
                    type="text"
                    placeholder="Your display name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '16px',
                      fontSize: '16px',
                      marginBottom: '32px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: '500',
                      transition: 'border-color 0.3s ease'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setShowNameInput(false);
                        setSelectedRoom(null);
                        setUserName(user?.displayName || '');
                      }}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '16px 24px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={joinRoom}
                      disabled={!userName.trim()}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '16px 24px',
                        background: userName.trim() 
                          ? office.rooms.find(r => r.id === selectedRoom)?.color || '#3b82f6'
                          : '#9CA3AF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: userName.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Join Room 🚀
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{
                    fontSize: '80px',
                    marginBottom: '20px',
                    animation: 'spin 2s linear infinite'
                  }}>
                    🚀
                  </div>
                  <h2 style={{
                    color: office.rooms.find(r => r.id === selectedRoom)?.color,
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '800'
                  }}>
                    Entering room...
                  </h2>
                  <p style={{
                    color: '#64748B',
                    margin: '12px 0 0 0',
                    fontSize: '16px'
                  }}>
                    Setting up your workspace
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {showInviteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            padding: '20px'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#1F1F1F',
              borderRadius: '20px',
              border: '1px solid #333',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#0F9D58',
                    margin: 0
                  }}>
                    Invite User to Office
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    margin: '4px 0 0 0'
                  }}>
                    Send an invitation to join {office?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage('');
                    setInviteSuccess('');
                    setInviteError('');
                  }}
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

              {/* Content */}
              <div style={{ padding: '24px' }}>
                {inviteSuccess ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}>✅</div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#0F9D58',
                      margin: '0 0 8px 0'
                    }}>
                      Invitation Sent!
                    </h3>
                    <p style={{
                      color: 'rgba(255,255,255,0.7)',
                      margin: 0
                    }}>
                      {inviteSuccess}
                    </p>
                  </div>
                ) : inviteError ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}>❌</div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#DB4437',
                      margin: '0 0 8px 0'
                    }}>
                      Unable to Send Invitation
                    </h3>
                    <p style={{
                      color: 'rgba(255,255,255,0.7)',
                      margin: '0 0 20px 0',
                      lineHeight: '1.5'
                    }}>
                      {inviteError}
                    </p>
                    <button
                      onClick={() => {
                        setInviteError('');
                        setInviteEmail('');
                        setInviteMessage('');
                      }}
                      style={{
                        padding: '12px 24px',
                        background: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '8px'
                      }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#2A2A2A',
                          border: '2px solid #444',
                          borderRadius: '12px',
                          fontSize: '16px',
                          color: 'white',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#0F9D58'}
                        onBlur={(e) => e.target.style.borderColor = '#444'}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '8px'
                      }}>
                        Personal Message (Optional)
                      </label>
                      <textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="Join our team collaboration space..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: '#2A2A2A',
                          border: '2px solid #444',
                          borderRadius: '12px',
                          fontSize: '14px',
                          color: 'white',
                          outline: 'none',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#0F9D58'}
                        onBlur={(e) => e.target.style.borderColor = '#444'}
                      />
                    </div>

                    <button
                      onClick={handleSendInvitation}
                      disabled={!inviteEmail.trim() || inviteLoading}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: inviteEmail.trim() && !inviteLoading 
                          ? '#059669' 
                          : '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: inviteEmail.trim() && !inviteLoading ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                        opacity: inviteLoading ? 0.7 : 1
                      }}
                    >
                      {inviteLoading ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Sending Invitation...
                        </>
                      ) : (
                        <>
                          📧 Send Invitation
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Office Settings Modal */}
            {showSettings && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                padding: '20px'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '600px',
                  maxHeight: '80vh',
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '32px 32px 24px 32px',
                    borderBottom: '1px solid #E2E8F0',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#0065FF',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      color: 'white',
                      boxShadow: '0 8px 24px rgba(0, 82, 204, 0.3)'
                    }}>
                      ⚙️
                    </div>
                    <h2 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#1E293B',
                      margin: '0 0 8px 0'
                    }}>
                      Office Settings
                    </h2>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748B',
                      margin: 0
                    }}>
                      Configure your office preferences and permissions
                    </p>
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    padding: '24px 32px',
                    overflowY: 'auto'
                  }}>
                    {/* Basic Settings */}
                    <div style={{
                      marginBottom: '32px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1E293B',
                        margin: '0 0 16px 0'
                      }}>
                        Basic Information
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            Office Name
                          </label>
                          <input
                            type="text"
                            value={officeSettings.name}
                            onChange={(e) => setOfficeSettings(prev => ({ ...prev, name: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '2px solid #E2E8F0',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.3s ease',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                          />
                        </div>

                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            Description
                          </label>
                          <textarea
                            value={officeSettings.description}
                            onChange={(e) => setOfficeSettings(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '2px solid #E2E8F0',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.3s ease',
                              boxSizing: 'border-box',
                              resize: 'none',
                              fontFamily: 'inherit'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Access Control */}
                    <div style={{
                      marginBottom: '32px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1E293B',
                        margin: '0 0 16px 0'
                      }}>
                        Access Control
                      </h3>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#1E293B',
                              marginBottom: '4px'
                            }}>
                              Public Office
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#64748B'
                            }}>
                              Allow anyone to discover and join this office
                            </div>
                          </div>
                          <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '44px',
                            height: '24px'
                          }}>
                            <input
                              type="checkbox"
                              checked={officeSettings.isPublic}
                              onChange={(e) => setOfficeSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: officeSettings.isPublic ? '#0052CC' : '#CBD5E1',
                              borderRadius: '24px',
                              transition: '0.3s',
                              transform: 'translateZ(0)'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: officeSettings.isPublic ? '23px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: '0.3s',
                                transform: 'translateZ(0)'
                              }} />
                            </span>
                          </label>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#1E293B',
                              marginBottom: '4px'
                            }}>
                              Require Approval
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#64748B'
                            }}>
                              New members need owner approval to join
                            </div>
                          </div>
                          <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '44px',
                            height: '24px'
                          }}>
                            <input
                              type="checkbox"
                              checked={officeSettings.requireApproval}
                              onChange={(e) => setOfficeSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                              position: 'absolute',
                              cursor: 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: officeSettings.requireApproval ? '#0052CC' : '#CBD5E1',
                              borderRadius: '24px',
                              transition: '0.3s',
                              transform: 'translateZ(0)'
                            }}>
                              <span style={{
                                position: 'absolute',
                                content: '',
                                height: '18px',
                                width: '18px',
                                left: officeSettings.requireApproval ? '23px' : '3px',
                                bottom: '3px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                transition: '0.3s',
                                transform: 'translateZ(0)'
                              }} />
                            </span>
                          </label>
                        </div>

                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            Maximum Participants
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={officeSettings.maxParticipants}
                            onChange={(e) => setOfficeSettings(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 50 }))}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              border: '2px solid #E2E8F0',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'border-color 0.3s ease',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid #E2E8F0',
                      paddingTop: '20px'
                    }}>
                      <button
                        onClick={() => setShowSettings(false)}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#E5E7EB';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveOfficeSettings}
                        style={{
                          padding: '12px 24px',
                          background: '#0065FF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 204, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <style jsx>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </>
  );
} 