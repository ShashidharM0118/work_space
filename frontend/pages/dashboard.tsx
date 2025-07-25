import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { getRecentRooms, getOwnedOffices, getMemberOffices, subscribeToUserRooms, createOffice, sendEmailInvitation, getUserInvitations, getSentInvitations, cancelInvitation, respondToOfficeInvitation, getOfficeActivityStats, type RoomMembership, type UserRooms, type ActivityStats } from '../lib/firebase';
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

export default function Dashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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
  const [showProfile, setShowProfile] = useState(false);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loadingActivityStats, setLoadingActivityStats] = useState(false);

  // Invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedOfficeForInvite, setSelectedOfficeForInvite] = useState<string | null>(null);

  const [authError, setAuthError] = useState('');

  // Redirect to landing page if user is not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

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

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{
          color: 'white',
          textAlign: 'center',
          fontSize: '18px'
        }}>
          Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>NexOffice Dashboard - Your Virtual Workspace</title>
        <meta name="description" content="Access your NexOffice virtual workspace and collaborate with your team" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏢</text></svg>" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F1419 0%, #1E293B 25%, #334155 50%, #475569 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 40px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              fontSize: '32px'
            }}>
              🏢
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              NexOffice
            </h1>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <img
                src={user.photoURL || ''}
                alt={user.displayName || 'User'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
              />
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          padding: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 16px 0'
            }}>
              Welcome back, {user.displayName?.split(' ')[0] || 'there'}! 👋
            </h2>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0
            }}>
              Ready to dive into your virtual workspace?
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowCreateOffice(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                ➕
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                Create New Office
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: 0
              }}>
                Set up a new virtual workspace for your team
              </p>
            </div>

            <div style={{
              padding: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowOfficeSelect(true)}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🚪
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                Join Office
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: 0
              }}>
                Enter an office code to join an existing workspace
              </p>
            </div>
          </div>

          {/* Recent Rooms */}
          {recentRooms.length > 0 && (
            <div style={{
              marginBottom: '40px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 24px 0'
              }}>
                Recent Rooms
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {recentRooms.slice(0, 6).map((room) => (
                  <div
                    key={room.roomId}
                    style={{
                      padding: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => router.push(`/room/${room.roomId}`)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 8px 0',
                      color: '#667eea'
                    }}>
                      {room.roomName}
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: '0 0 12px 0'
                    }}>
                      {room.officeName}
                    </p>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      Last active: {new Date(room.lastActiveAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Office Modal */}
        {showCreateOffice && (
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
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 24px 0'
              }}>
                Create New Office
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Office Name *
                </label>
                <input
                  type="text"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="Enter office name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newOfficeDescription}
                  onChange={(e) => setNewOfficeDescription(e.target.value)}
                  placeholder="Describe your office workspace"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {authError && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '8px',
                  color: '#FCA5A5',
                  fontSize: '14px'
                }}>
                  {authError}
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowCreateOffice(false);
                    setNewOfficeName('');
                    setNewOfficeDescription('');
                    setAuthError('');
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createNewOffice}
                  disabled={isCreatingOffice || !newOfficeName.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isCreatingOffice || !newOfficeName.trim() ? '#666' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: isCreatingOffice || !newOfficeName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isCreatingOffice ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Creating...
                    </>
                  ) : (
                    'Create Office'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Office Modal */}
        {showOfficeSelect && (
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
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#1E293B',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 24px 0'
              }}>
                Join Office
              </h3>

              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Office Code
                </label>
                <input
                  type="text"
                  value={officeCode}
                  onChange={(e) => setOfficeCode(e.target.value)}
                  placeholder="Enter office code"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px'
                  }}
                />
              </div>

              {authError && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '8px',
                  color: '#FCA5A5',
                  fontSize: '14px'
                }}>
                  {authError}
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowOfficeSelect(false);
                    setOfficeCode('');
                    setAuthError('');
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={joinOfficeByCode}
                  disabled={!officeCode.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: !officeCode.trim() ? '#666' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: !officeCode.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  Join Office
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}