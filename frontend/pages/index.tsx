import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { getRecentRooms, getOwnedOffices, getMemberOffices, subscribeToUserRooms, createOffice, sendEmailInvitation, getUserInvitations, getSentInvitations, cancelInvitation, respondToOfficeInvitation, type RoomMembership, type UserRooms } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface Office {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  participants: number;
  maxParticipants: number;
}

const defaultOffices: Office[] = [
  {
    id: 'frontend',
    name: 'Frontend Team',
    description: 'UI/UX Development & Design',
    color: '#0052CC',
    icon: '💻',
    position: { x: 10, y: 20 },
    size: { width: 25, height: 20 },
    participants: 0,
    maxParticipants: 8
  },
  {
    id: 'backend',
    name: 'Backend Team',
    description: 'Server & Database Development',
    color: '#00875A',
    icon: '⚙️',
    position: { x: 50, y: 20 },
    size: { width: 25, height: 20 },
    participants: 0,
    maxParticipants: 8
  },
  {
    id: 'integrated',
    name: 'Integration Hub',
    description: 'Cross-team Collaboration',
    color: '#BF2600',
    icon: '🤝',
    position: { x: 30, y: 55 },
    size: { width: 30, height: 25 },
    participants: 0,
    maxParticipants: 12
  }
];

// Sent Invitation Card Component
const SentInvitationCard = ({ invitation, onCancel }: {
  invitation: any;
  onCancel: (invitationId: string) => void;
}) => {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await onCancel(invitation.id);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#BF2600';
      case 'accepted': return '#0F9D58';
      case 'rejected': return '#DB4437';
      case 'cancelled': return '#666';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'accepted': return 'ACCEPTED';
      case 'rejected': return 'REJECTED';
      case 'cancelled': return 'CANCELLED';
      default: return 'UNKNOWN';
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#2A2A2A',
      borderRadius: '16px',
      border: '1px solid #444',
      transition: 'all 0.3s ease'
    }}>
      {/* Invitation Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#7B68EE',
            margin: '0 0 4px 0'
          }}>
            {invitation.officeName}
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 8px 0'
          }}>
            Sent to {invitation.inviteeEmail}
          </p>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            margin: 0
          }}>
            Sent {formatDate(invitation.createdAt)}
          </p>
        </div>
        <div style={{
          padding: '4px 8px',
          backgroundColor: getStatusColor(invitation.status),
          color: 'white',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: '600'
        }}>
          {getStatusText(invitation.status)}
        </div>
      </div>

      {/* Message */}
      {invitation.message && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
            margin: 0,
            fontStyle: 'italic'
          }}>
            "{invitation.message}"
          </p>
        </div>
      )}

      {/* Action Button */}
      {invitation.status === 'pending' && (
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          style={{
            padding: '12px 20px',
            backgroundColor: isCancelling ? '#666' : '#DB4437',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isCancelling ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.3s ease',
            opacity: isCancelling ? 0.7 : 1
          }}
        >
          {isCancelling ? (
            <>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Cancelling...
            </>
          ) : (
            <>
              🗑️ Cancel Invitation
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Invitation Card Component
const InvitationCard = ({ invitation, onRespond }: {
  invitation: any;
  onRespond: (invitationId: string, response: 'accepted' | 'rejected') => void;
}) => {
  const [isResponding, setIsResponding] = useState(false);

  const handleResponse = async (response: 'accepted' | 'rejected') => {
    setIsResponding(true);
    try {
      await onRespond(invitation.id, response);
    } finally {
      setIsResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#2A2A2A',
      borderRadius: '16px',
      border: '1px solid #444',
      transition: 'all 0.3s ease'
    }}>
      {/* Office Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#0F9D58',
            margin: '0 0 4px 0'
          }}>
            {invitation.officeName}
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 8px 0'
          }}>
            Invited by {invitation.inviterName}
          </p>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            margin: 0
          }}>
            Received {formatDate(invitation.createdAt)}
          </p>
        </div>
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#BF2600',
          color: 'white',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: '600'
        }}>
          PENDING
        </div>
      </div>

      {/* Message */}
      {invitation.message && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
            margin: 0,
            fontStyle: 'italic'
          }}>
            "{invitation.message}"
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px'
      }}>
        <button
          onClick={() => handleResponse('accepted')}
          disabled={isResponding}
          style={{
            flex: 1,
            padding: '12px 20px',
            background: isResponding ? '#666' : 'linear-gradient(135deg, #0F9D58 0%, #00875A 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isResponding ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.3s ease',
            opacity: isResponding ? 0.7 : 1
          }}
        >
          {isResponding ? (
            <>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Processing...
            </>
          ) : (
            <>
              ✅ Accept
            </>
          )}
        </button>
        
        <button
          onClick={() => handleResponse('rejected')}
          disabled={isResponding}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: isResponding ? '#666' : '#DB4437',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isResponding ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.3s ease',
            opacity: isResponding ? 0.7 : 1
          }}
        >
          ❌ Decline
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [showCreateOffice, setShowCreateOffice] = useState(false);
  const [showOfficeSelect, setShowOfficeSelect] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [hoveredOffice, setHoveredOffice] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [officeCode, setOfficeCode] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeDescription, setNewOfficeDescription] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCreatingOffice, setIsCreatingOffice] = useState(false);

  // Room management state
  const [recentRooms, setRecentRooms] = useState<RoomMembership[]>([]);
  const [ownedOffices, setOwnedOffices] = useState<string[]>([]);
  const [memberOffices, setMemberOffices] = useState<string[]>([]);
  const [userRooms, setUserRooms] = useState<UserRooms | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [showSentInvitations, setShowSentInvitations] = useState(false);

  // Invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedOfficeForInvite, setSelectedOfficeForInvite] = useState<string | null>(null);

  // Auto-fill user name from Google account
  useEffect(() => {
    if (user?.displayName) {
      setUserName(user.displayName);
    }
  }, [user]);

  // Load user's recent rooms and owned offices
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const recent = await getRecentRooms(user.uid, 10);
        const owned = await getOwnedOffices(user.uid);
        const member = await getMemberOffices(user.uid);
        const invitations = await getUserInvitations(user.uid);
        const sent = await getSentInvitations(user.uid);
        setRecentRooms(recent);
        setOwnedOffices(owned);
        setMemberOffices(member);
        setPendingInvitations(invitations);
        setSentInvitations(sent);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUserRooms(user.uid, (rooms) => {
      setUserRooms(rooms);
      if (rooms) {
        setRecentRooms(rooms.recentRooms.filter(room => room.isActive).slice(0, 10));
        setOwnedOffices(rooms.ownedOffices);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError('');
    
    // Set a timeout to reset loading state in case authentication gets stuck
    const timeoutId = setTimeout(() => {
      setIsSigningIn(false);
      setAuthError('Authentication timed out. Please try again.');
    }, 30000); // 30 seconds timeout
    
    try {
      const result = await signInWithGoogle();
      
      // Clear timeout if authentication completes
      clearTimeout(timeoutId);
      
      // If result is null, it means we're using redirect method
      if (result === null) {
        // Don't reset isSigningIn yet, redirect will handle it
        return;
      }
      
      setIsSigningIn(false);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Sign in error:', error);
      setIsSigningIn(false);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google Sign-In. Please contact support or try from an authorized domain.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('Cross-Origin-Opener-Policy') || error.message.includes('opener')) {
        errorMessage = 'Authentication popup was blocked. Please disable popup blockers and try again.';
      }
      
      setAuthError(errorMessage);
    }
  };

  const createNewOffice = async () => {
    if (!newOfficeName.trim()) {
      setAuthError('Please enter an office name.');
      return;
    }

    if (!user) {
      setAuthError('You must be signed in to create an office.');
      return;
    }

    setIsCreatingOffice(true);
    try {
      const description = newOfficeDescription.trim() || 'A collaborative workspace for teams';
      const { office, officeId } = await createOffice(
        newOfficeName.trim(),
        description,
        user.uid,
        user.displayName || user.email || 'Unknown User'
      );
      
      // Close modal and reset form
      setShowCreateOffice(false);
      setNewOfficeName('');
      setNewOfficeDescription('');
      setAuthError('');
      
      // Navigate to the new office
      await router.push(`/office/${officeId}`);
    } catch (error) {
      console.error('Error creating office:', error);
      setAuthError('Failed to create office. Please try again.');
    } finally {
      setIsCreatingOffice(false);
    }
  };

  const joinOfficeByCode = async () => {
    if (!officeCode.trim()) {
      setAuthError('Please enter an office code.');
      return;
    }

    try {
      await router.push(`/office/${officeCode.trim()}`);
    } catch (error) {
      console.error('Error joining office:', error);
      setAuthError('Failed to join office. Please check the code and try again.');
    }
  };

  const handleOfficeClick = (officeId: string) => {
    setSelectedOffice(officeId);
    setShowNameInput(true);
  };

  const joinRoom = () => {
    if (!userName.trim() || !selectedOffice) return;
    
    setIsEntering(true);
    localStorage.setItem('userName', userName.trim());
    
    setTimeout(() => {
      router.push(`/room/${selectedOffice}`);
    }, 1000);
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !selectedOfficeForInvite || !user) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    try {
      const result = await sendEmailInvitation(
        selectedOfficeForInvite,
        'main-hall', // Default to main hall for now
        user.uid,
        user.displayName || 'Unknown User',
        user.email || '',
        inviteEmail.trim(),
        inviteMessage.trim()
      );

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
      setSelectedOfficeForInvite(null);
      
      // Show success message
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      setAuthError('Failed to send invitation. Please try again.');
    }
  };

  const handleOfficeHover = (officeId: string) => {
    setHoveredOffice(officeId);
  };

  const handleOfficeLeave = () => {
    setHoveredOffice(null);
  };

  const getOfficeStyle = (office: Office) => ({
    position: 'absolute' as const,
    left: `${office.position.x}%`,
    top: `${office.position.y}%`,
    width: `${office.size.width}%`,
    height: `${office.size.height}%`,
    backgroundColor: hoveredOffice === office.id ? office.color : `${office.color}08`,
    border: `2px solid ${office.color}`,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: hoveredOffice === office.id ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: hoveredOffice === office.id 
      ? `0 25px 50px -12px ${office.color}40, 0 8px 16px -8px ${office.color}20`
      : `0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
    backdropFilter: 'blur(16px)',
    background: hoveredOffice === office.id 
      ? `linear-gradient(135deg, ${office.color}20, ${office.color}10)`
      : `linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))`,
  });

  if (!user) {
    return (
      <>
        <Head>
          <title>Enterprise Virtual Office Platform</title>
          <meta name="description" content="Premium enterprise-grade virtual office platform for seamless team collaboration" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>

        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0F1419 0%, #1E293B 25%, #334155 50%, #475569 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative'
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px',
            opacity: 0.5
          }} />

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            padding: '56px',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {/* Decorative gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '140px',
              background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 50%, #0084FF 100%)',
              opacity: 0.08,
              borderRadius: '24px 24px 0 0'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '88px',
                height: '88px',
                margin: '0 auto 32px',
                background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                boxShadow: '0 10px 25px -5px rgba(0, 82, 204, 0.4)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                  animation: 'shimmer 3s infinite'
                }} />
                🏢
              </div>

              <h1 style={{
                fontSize: '40px',
                fontWeight: '800',
                color: '#0F172A',
                margin: '0 0 20px 0',
                lineHeight: '1.1',
                background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Enterprise Virtual Office
              </h1>

              <p style={{
                fontSize: '18px',
                color: '#64748B',
                margin: '0 0 48px 0',
                lineHeight: '1.6',
                fontWeight: '500'
              }}>
                Premium enterprise-grade collaboration platform with advanced security,
                HD communications, and comprehensive workflow integration
              </p>

              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                style={{
                  width: '100%',
                  padding: '20px 32px',
                  backgroundColor: isSigningIn ? '#94A3B8' : '#0052CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: isSigningIn ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSigningIn ? 'none' : '0 10px 25px -5px rgba(0, 82, 204, 0.4), 0 4px 6px -2px rgba(0, 82, 204, 0.1)',
                  opacity: isSigningIn ? 0.8 : 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => !isSigningIn && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !isSigningIn && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isSigningIn ? (
                  <>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {authError && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <strong>Authentication Error</strong>
                  </div>
                  <div style={{ marginTop: '4px' }}>{authError}</div>
                </div>
              )}

              <div style={{
                marginTop: '40px',
                padding: '32px',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                borderRadius: '16px',
                textAlign: 'left',
                border: '1px solid #E2E8F0'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#0F172A',
                  margin: '0 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>✨</span>
                  Enterprise Features
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  fontSize: '15px',
                  color: '#475569',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>🎥</span>
                    4K Video Conferencing
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>🖥️</span>
                    Advanced Screen Sharing
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>🎨</span>
                    Collaborative Whiteboard
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>💬</span>
                    Real-time Messaging
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>🏢</span>
                    Virtual Office Spaces
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>🔒</span>
                    Enterprise Security
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </>
    );
  }

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'rejected') => {
    if (!user) return;
    
    try {
      await respondToOfficeInvitation(invitationId, response, user.uid);
      
      // Refresh invitations list
      const updatedInvitations = await getUserInvitations(user.uid);
      setPendingInvitations(updatedInvitations);
      
      // Show success message
      if (response === 'accepted') {
        // Refresh user data to show new office access
        const owned = await getOwnedOffices(user.uid);
        const member = await getMemberOffices(user.uid);
        setOwnedOffices(owned);
        setMemberOffices(member);
      }
      
    } catch (error: any) {
      console.error('Error responding to invitation:', error);
      setAuthError(error.message || 'Failed to respond to invitation');
    }
  };

  // Handle cancelling sent invitations
  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) return;
    
    try {
      await cancelInvitation(invitationId);
      
      // Refresh sent invitations list
      const updatedSentInvitations = await getSentInvitations(user.uid);
      setSentInvitations(updatedSentInvitations);
      
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      setAuthError(error.message || 'Failed to cancel invitation');
    }
  };

  return (
    <>
      <Head>
        <title>Enterprise Virtual Office - Dashboard</title>
        <meta name="description" content="Premium enterprise virtual office platform for team collaboration" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F1419 0%, #1E293B 25%, #334155 50%, #475569 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        position: 'relative'
      }}>
        {/* Header */}
        <header style={{
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 8px 16px -4px rgba(0, 82, 204, 0.4)'
            }}>
              🏢
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '800',
                color: 'white',
                margin: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Enterprise Virtual Office
              </h1>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '2px 0 0 0',
                fontWeight: '500'
              }}>
                Welcome back, {user.displayName?.split(' ')[0]}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '32px',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <img
                src={user.photoURL || ''}
                alt={user.displayName || ''}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              />
              <div style={{ display: window.innerWidth > 640 ? 'block' : 'none' }}>
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {user.displayName}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {userRooms ? `${userRooms.totalRoomsJoined} rooms joined` : 'Loading...'}
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              style={{
                padding: '12px 20px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
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
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div style={{ padding: '40px 32px' }}>
          {/* Quick Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '48px'
          }}>
            <button
              onClick={() => setShowCreateOffice(true)}
              style={{
                padding: '20px 40px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                color: '#0F172A',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '28px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25), 0 8px 16px -8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minWidth: '220px',
                justifyContent: 'center',
                backdropFilter: 'blur(20px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0,0,0,0.25)';
              }}
            >
              <span style={{ fontSize: '20px' }}>➕</span>
              Create Office
            </button>

            {/* Sent Invitations Button for owners */}
            {sentInvitations.filter(inv => inv.status === 'pending').length > 0 && (
              <button
                onClick={() => setShowSentInvitations(true)}
                style={{
                  padding: '20px 40px',
                  background: 'linear-gradient(135deg, #7B68EE 0%, #6A5ACD 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '28px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: '220px',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 20px 40px -12px rgba(123, 104, 238, 0.25)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(123, 104, 238, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(123, 104, 238, 0.25)';
                }}
              >
                <span style={{ fontSize: '20px' }}>📤</span>
                {sentInvitations.filter(inv => inv.status === 'pending').length} Sent Invitation{sentInvitations.filter(inv => inv.status === 'pending').length !== 1 ? 's' : ''}
              </button>
            )}

            <button
              onClick={() => setShowOfficeSelect(true)}
              style={{
                padding: '20px 40px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '28px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                minWidth: '220px',
                justifyContent: 'center',
                backdropFilter: 'blur(20px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              <span style={{ fontSize: '20px' }}>🏢</span>
              Browse Offices
            </button>



            {/* Office Invitations Button */}
            {pendingInvitations.length > 0 && (
              <button
                onClick={() => setShowInvitations(true)}
                style={{
                  padding: '20px 40px',
                  background: 'linear-gradient(135deg, #0F9D58 0%, #00875A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '28px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: '220px',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 20px 40px -12px rgba(15, 157, 88, 0.25)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(15, 157, 88, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(15, 157, 88, 0.25)';
                }}
              >
                <span style={{ fontSize: '20px' }}>📧</span>
                {pendingInvitations.length} Invitation{pendingInvitations.length !== 1 ? 's' : ''}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#DB4437',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  animation: 'pulse 2s infinite'
                }}>
                  {pendingInvitations.length}
                </div>
              </button>
            )}
          </div>

          {/* Recent Rooms Section */}
          {recentRooms.length > 0 && (
            <div style={{
              marginBottom: '48px',
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>⏰</span>
                Recent Rooms
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {recentRooms.map((room) => (
                  <div
                    key={room.roomId}
                    onClick={() => router.push(`/room/${room.roomId}`)}
                    style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'white',
                        margin: 0
                      }}>
                        {room.roomName}
                      </h3>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: room.role === 'owner' ? '#0052CC' : room.role === 'member' ? '#00875A' : '#BF2600',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {room.role}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.7)',
                      margin: '0 0 8px 0'
                    }}>
                      {room.officeName}
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      margin: 0
                    }}>
                      Last active: {new Date(room.lastActiveAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owned Offices Section */}
          {ownedOffices.length > 0 && (
            <div style={{
              marginBottom: '48px',
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>👑</span>
                Your Offices
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {ownedOffices.map((officeId) => (
                  <div
                    key={officeId}
                    onClick={() => router.push(`/office/${officeId}`)}
                    style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #0052CC20 0%, #0052CC10 100%)',
                      borderRadius: '16px',
                      border: '2px solid #0052CC',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = '#0052CC30';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = '#0052CC20';
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0 0 8px 0'
                    }}>
                      Office
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.7)',
                      margin: 0,
                      fontFamily: 'monospace'
                    }}>
                      {officeId.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member Offices Section */}
          {memberOffices.length > 0 && (
            <div style={{
              marginBottom: '48px',
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(15, 157, 88, 0.1) 0%, rgba(0, 135, 90, 0.05) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(15, 157, 88, 0.2)',
              backdropFilter: 'blur(20px)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>🤝</span>
                Joined Offices
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {memberOffices.map((officeId) => (
                  <div
                    key={officeId}
                    onClick={() => router.push(`/office/${officeId}`)}
                    style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, #0F9D5820 0%, #0F9D5810 100%)',
                      borderRadius: '16px',
                      border: '2px solid #0F9D58',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = '#0F9D5830';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = '#0F9D5820';
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0 0 8px 0'
                    }}>
                      Office
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.7)',
                      margin: 0,
                      fontFamily: 'monospace'
                    }}>
                      {officeId.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue with existing modals... */}
        {/* Demo Office Map */}
        {showOfficeSelect && (
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
              position: 'relative',
              width: '100%',
              maxWidth: '1200px',
              height: '70vh',
              minHeight: '500px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              borderRadius: '32px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}>
              {/* Premium grid pattern */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                opacity: 0.6
              }} />

              {/* Room elements */}
              {defaultOffices.map((office) => (
                <div
                  key={office.id}
                  style={getOfficeStyle(office)}
                  onMouseEnter={() => setHoveredOffice(office.id)}
                  onMouseLeave={() => setHoveredOffice(null)}
                  onClick={() => handleOfficeClick(office.id)}
                >
                  <div style={{
                    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                    marginBottom: '1rem',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                  }}>
                    {office.icon}
                  </div>
                  <h3 style={{
                    color: hoveredOffice === office.id ? 'white' : '#0F172A',
                    margin: '0 0 0.5rem 0',
                    fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
                    fontWeight: '800',
                    textAlign: 'center',
                    textShadow: hoveredOffice === office.id ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                  }}>
                    {office.name}
                  </h3>
                  <p style={{
                    color: hoveredOffice === office.id ? 'rgba(255,255,255,0.9)' : '#64748B',
                    margin: '0 0 0.75rem 0',
                    fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
                    textAlign: 'center',
                    fontWeight: '600',
                    padding: '0 12px',
                    lineHeight: '1.4'
                  }}>
                    {office.description}
                  </p>
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: hoveredOffice === office.id ? 'rgba(255,255,255,0.25)' : office.color,
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)',
                    fontWeight: '700',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    {office.participants}/{office.maxParticipants} members
                  </div>
                </div>
              ))}

              {/* Close button */}
              <button
                onClick={() => setShowOfficeSelect(false)}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Create Office Modal */}
        {showCreateOffice && (
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
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                               <h2 style={{
                   fontSize: '28px',
                   fontWeight: '800',
                   color: '#0F172A',
                   margin: '0 0 12px 0'
                 }}>
                   Create Your Office
                 </h2>
                 <p style={{
                   color: '#64748B',
                   margin: '0 0 32px 0',
                   fontSize: '16px',
                   lineHeight: '1.5'
                 }}>
                   Create a unique virtual office space for your team
                 </p>
   
                 <input
                   type="text"
                   value={newOfficeName}
                   onChange={(e) => setNewOfficeName(e.target.value)}
                   placeholder="Office name (e.g., Marketing Team HQ)..."
                   maxLength={50}
                   style={{
                     width: '100%',
                     padding: '16px 20px',
                     fontSize: '16px',
                     border: '2px solid #E2E8F0',
                     borderRadius: '12px',
                     outline: 'none',
                     marginBottom: '16px',
                     transition: 'all 0.3s ease',
                     fontWeight: '500',
                     boxSizing: 'border-box'
                   }}
                   onFocus={(e) => {
                     e.target.style.borderColor = '#0052CC';
                     e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
                   }}
                   onBlur={(e) => {
                     e.target.style.borderColor = '#E2E8F0';
                     e.target.style.boxShadow = 'none';
                   }}
                   autoFocus
                 />

                 <textarea
                   value={newOfficeDescription}
                   onChange={(e) => setNewOfficeDescription(e.target.value)}
                   placeholder="Description (optional)..."
                   maxLength={200}
                   rows={3}
                   style={{
                     width: '100%',
                     padding: '16px 20px',
                     fontSize: '14px',
                     border: '2px solid #E2E8F0',
                     borderRadius: '12px',
                     outline: 'none',
                     marginBottom: '24px',
                     transition: 'all 0.3s ease',
                     fontWeight: '500',
                     boxSizing: 'border-box',
                     resize: 'none',
                     fontFamily: 'inherit'
                   }}
                   onFocus={(e) => {
                     e.target.style.borderColor = '#0052CC';
                     e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
                   }}
                   onBlur={(e) => {
                     e.target.style.borderColor = '#E2E8F0';
                     e.target.style.boxShadow = 'none';
                   }}
                 />

              <input
                type="text"
                value={newOfficeDescription}
                onChange={(e) => setNewOfficeDescription(e.target.value)}
                placeholder="Enter office description (optional)"
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  fontSize: '16px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '16px',
                  outline: 'none',
                  marginBottom: '32px',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0052CC';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newOfficeDescription.trim()) {
                    // No action on Enter for description
                  }
                }}
              />

              {authError && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626',
                  fontSize: '14px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    {authError}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setShowCreateOffice(false);
                    setNewOfficeName('');
                    setNewOfficeDescription('');
                    setAuthError('');
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
                  onClick={createNewOffice}
                  disabled={!newOfficeName.trim() || isCreatingOffice}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '16px 24px',
                    background: newOfficeName.trim() && !isCreatingOffice
                      ? 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)'
                      : '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: newOfficeName.trim() && !isCreatingOffice ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isCreatingOffice ? (
                    <>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Creating...
                    </>
                  ) : (
                    'Create Office 🏢'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join by Code Modal */}
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
                    {defaultOffices.find(o => o.id === selectedOffice)?.icon}
                  </div>
                  <h2 style={{
                    color: defaultOffices.find(o => o.id === selectedOffice)?.color,
                    margin: '0 0 12px 0',
                    fontSize: '28px',
                    fontWeight: '800'
                  }}>
                    Joining {defaultOffices.find(o => o.id === selectedOffice)?.name}
                  </h2>
                  <p style={{
                    color: '#64748B',
                    margin: '0 0 32px 0',
                    fontSize: '16px',
                    lineHeight: '1.5'
                  }}>
                    {defaultOffices.find(o => o.id === selectedOffice)?.description}
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
                        setSelectedOffice(null);
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
                          ? `linear-gradient(135deg, ${defaultOffices.find(o => o.id === selectedOffice)?.color} 0%, ${defaultOffices.find(o => o.id === selectedOffice)?.color}CC 100%)`
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
                    color: defaultOffices.find(o => o.id === selectedOffice)?.color,
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

        {/* Email Invitation Modal */}
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
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '40px',
              width: '100%',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '800',
                color: '#0F172A',
                margin: '0 0 12px 0'
              }}>
                Send Invitation
              </h2>
              <p style={{
                color: '#64748B',
                margin: '0 0 32px 0',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                Invite someone to join your virtual office
              </p>

              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '16px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  outline: 'none',
                  marginBottom: '16px',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0052CC';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus
              />

              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message (optional)..."
                maxLength={200}
                rows={3}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '14px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  outline: 'none',
                  marginBottom: '24px',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0052CC';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
              />

              {authError && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  color: '#DC2626',
                  fontSize: '14px',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    {authError}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage('');
                    setSelectedOfficeForInvite(null);
                    setAuthError('');
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
                  onClick={sendInvitation}
                  disabled={!inviteEmail.trim()}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '16px 24px',
                    background: inviteEmail.trim() 
                      ? 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)'
                      : '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Send Invitation 📧
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {copySuccess && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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

        {/* Office Invitations Modal */}
        {showInvitations && (
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
              backgroundColor: '#1F1F1F',
              borderRadius: '20px',
              border: '1px solid #333',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
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
                    Office Invitations
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    margin: '4px 0 0 0'
                  }}>
                    {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowInvitations(false)}
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
              <div style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto'
              }}>
                {pendingInvitations.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📫</div>
                    <p>No pending invitations</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {pendingInvitations.map((invitation: any) => (
                      <InvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        onRespond={handleInvitationResponse}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
                  )}

        {/* Sent Invitations Modal */}
        {showSentInvitations && (
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
              maxWidth: '700px',
              maxHeight: '80vh',
              backgroundColor: '#1F1F1F',
              borderRadius: '20px',
              border: '1px solid #333',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
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
                    color: '#7B68EE',
                    margin: 0
                  }}>
                    Sent Invitations
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.7)',
                    margin: '4px 0 0 0'
                  }}>
                    Manage your office invitations
                  </p>
                </div>
                <button
                  onClick={() => setShowSentInvitations(false)}
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
              <div style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto'
              }}>
                {sentInvitations.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                    <p>No invitations sent yet</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {sentInvitations.map((invitation: any) => (
                      <SentInvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        onCancel={handleCancelInvitation}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    </>
  );
} 