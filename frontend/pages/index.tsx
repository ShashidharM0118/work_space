import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

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
}

const rooms: Room[] = [
  {
    id: 'frontend',
    name: 'Frontend Team',
    description: 'UI/UX Development & Design',
    color: '#4F46E5',
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
    color: '#059669',
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
    color: '#DC2626',
    icon: '🤝',
    position: { x: 30, y: 55 },
    size: { width: 30, height: 25 },
    participants: 0,
    maxParticipants: 12
  }
];

export default function Office() {
  const router = useRouter();
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    // Simulate real-time participant count updates
    const interval = setInterval(() => {
      // This would be replaced with real WebSocket updates
      rooms.forEach(room => {
        room.participants = Math.floor(Math.random() * (room.maxParticipants + 1));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId);
    setShowNameInput(true);
  };

  const joinRoom = () => {
    if (!userName.trim() || !selectedRoom) return;
    
    setIsEntering(true);
    // Store user name for the room
    localStorage.setItem('userName', userName.trim());
    
    setTimeout(() => {
      router.push(`/room/${selectedRoom}`);
    }, 1000);
  };

  const getRoomStyle = (room: Room) => ({
    position: 'absolute' as const,
    left: `${room.position.x}%`,
    top: `${room.position.y}%`,
    width: `${room.size.width}%`,
    height: `${room.size.height}%`,
    backgroundColor: hoveredRoom === room.id ? room.color : `${room.color}20`,
    border: `3px solid ${room.color}`,
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: hoveredRoom === room.id ? 'scale(1.05)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: hoveredRoom === room.id 
      ? `0 20px 40px ${room.color}40, 0 0 0 4px ${room.color}20`
      : `0 10px 20px ${room.color}20`,
    backdropFilter: 'blur(10px)',
  });

  return (
    <>
      <Head>
        <title>Virtual Office - Choose Your Room</title>
        <meta name="description" content="Virtual office space for team collaboration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
          `,
          animation: 'float 6s ease-in-out infinite'
        }} />

        {/* Header */}
        <header style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem 0',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            color: 'white',
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '-0.02em'
          }}>
            🏢 Virtual Office
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.9)',
            margin: '0.5rem 0 0 0',
            fontWeight: '400'
          }}>
            Choose your team room to start collaborating
          </p>
        </header>

        {/* Office Map */}
        <div style={{
          position: 'relative',
          width: '90%',
          height: '70vh',
          margin: '2rem auto',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '30px',
          border: '2px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }}>
          {/* Office floor pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.05) 0px,
                rgba(255,255,255,0.05) 1px,
                transparent 1px,
                transparent 20px
              ),
              repeating-linear-gradient(
                -45deg,
                rgba(255,255,255,0.05) 0px,
                rgba(255,255,255,0.05) 1px,
                transparent 1px,
                transparent 20px
              )
            `,
            opacity: 0.3
          }} />

          {/* Room elements */}
          {rooms.map((room) => (
            <div
              key={room.id}
              style={getRoomStyle(room)}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => handleRoomClick(room.id)}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '0.5rem',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}>
                {room.icon}
              </div>
              <h3 style={{
                color: hoveredRoom === room.id ? 'white' : room.color,
                margin: '0 0 0.25rem 0',
                fontSize: '1.1rem',
                fontWeight: '700',
                textAlign: 'center',
                textShadow: hoveredRoom === room.id ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
              }}>
                {room.name}
              </h3>
              <p style={{
                color: hoveredRoom === room.id ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
                margin: 0,
                fontSize: '0.8rem',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {room.description}
              </p>
              <div style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: hoveredRoom === room.id ? 'rgba(255,255,255,0.2)' : room.color,
                color: hoveredRoom === room.id ? 'white' : 'white',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {room.participants}/{room.maxParticipants} users
              </div>
            </div>
          ))}

          {/* Legend */}
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '15px',
            padding: '1rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h4 style={{
              color: 'white',
              margin: '0 0 0.5rem 0',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              💡 How to join
            </h4>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              margin: 0,
              fontSize: '0.8rem',
              lineHeight: '1.4'
            }}>
              Click on any room to enter<br />
              • Frontend: UI/UX focused<br />
              • Backend: Server development<br />
              • Integration: Cross-team work
            </p>
          </div>
        </div>

        {/* Room Entry Modal */}
        {showNameInput && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '2rem',
              minWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              transform: isEntering ? 'scale(0.9) rotateX(10deg)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}>
              {!isEntering ? (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {rooms.find(r => r.id === selectedRoom)?.icon}
                  </div>
                  <h2 style={{
                    color: rooms.find(r => r.id === selectedRoom)?.color,
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.8rem',
                    fontWeight: '700'
                  }}>
                    Joining {rooms.find(r => r.id === selectedRoom)?.name}
                  </h2>
                  <p style={{
                    color: '#666',
                    margin: '0 0 2rem 0',
                    fontSize: '1rem'
                  }}>
                    {rooms.find(r => r.id === selectedRoom)?.description}
                  </p>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      marginBottom: '1.5rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setShowNameInput(false);
                        setSelectedRoom(null);
                        setUserName('');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={joinRoom}
                      disabled={!userName.trim()}
                      style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: rooms.find(r => r.id === selectedRoom)?.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: userName.trim() ? 'pointer' : 'not-allowed',
                        opacity: userName.trim() ? 1 : 0.5,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Join Room 🚀
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{
                    fontSize: '4rem',
                    marginBottom: '1rem',
                    animation: 'spin 2s linear infinite'
                  }}>
                    🚀
                  </div>
                  <h2 style={{
                    color: rooms.find(r => r.id === selectedRoom)?.color,
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: '700'
                  }}>
                    Entering room...
                  </h2>
                  <p style={{
                    color: '#666',
                    margin: '0.5rem 0 0 0'
                  }}>
                    Setting up your workspace
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(1deg); }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          input:focus {
            border-color: ${rooms.find(r => r.id === selectedRoom)?.color} !important;
            box-shadow: 0 0 0 3px ${rooms.find(r => r.id === selectedRoom)?.color}20 !important;
          }

          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    </>
  );
} 