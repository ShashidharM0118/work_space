import { motion, AnimatePresence } from 'framer-motion';

interface DemoContentProps {
  isPlaying: boolean;
  currentStep: number;
  showOfficeCreation: boolean;
  showOfficeView: boolean;
  showRoomView: boolean;
  demoSteps: any[];
  demoRooms: any[];
  participants: any[];
  messages: any[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  sendDemoMessage: () => void;
  hoveredRoom: string | null;
  setHoveredRoom: (id: string | null) => void;
  handleRoomClick: (id: string) => void;
  getRoomStyle: (room: any) => any;
  isVideoEnabled: boolean;
  setIsVideoEnabled: (enabled: boolean) => void;
  isAudioEnabled: boolean;
  setIsAudioEnabled: (enabled: boolean) => void;
  isScreenSharing: boolean;
  setIsScreenSharing: (sharing: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showWhiteboard: boolean;
  setShowWhiteboard: (show: boolean) => void;
}

export default function DemoContent({
  isPlaying,
  currentStep,
  showOfficeCreation,
  showOfficeView,
  showRoomView,
  demoSteps,
  demoRooms,
  participants,
  messages,
  newMessage,
  setNewMessage,
  sendDemoMessage,
  hoveredRoom,
  setHoveredRoom,
  handleRoomClick,
  getRoomStyle,
  isVideoEnabled,
  setIsVideoEnabled,
  isAudioEnabled,
  setIsAudioEnabled,
  isScreenSharing,
  setIsScreenSharing,
  showChat,
  setShowChat,
  showWhiteboard,
  setShowWhiteboard
}: DemoContentProps) {
  return (
    <div style={{
      flex: 1,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <AnimatePresence mode="wait">
        {!isPlaying && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center'
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                fontSize: '120px',
                marginBottom: '32px'
              }}
            >
              🏢
            </motion.div>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#ffffff'
            }}>
              Welcome to NexOffice
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#94a3b8',
              maxWidth: '600px',
              lineHeight: '1.6'
            }}>
              Experience the future of remote collaboration with our virtual office platform. 
              Click play to see how teams connect, collaborate, and thrive in digital workspaces.
            </p>
          </motion.div>
        )}

        {isPlaying && showOfficeCreation && (
          <motion.div
            key="office-creation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}
          >
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '24px',
                color: '#ffffff'
              }}>
                Creating Your Virtual Office
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '24px'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid rgba(139, 92, 246, 0.3)',
                    borderTop: '4px solid #8b5cf6',
                    borderRadius: '50%'
                  }}
                />
              </div>
              <p style={{
                color: '#94a3b8',
                fontSize: '16px'
              }}>
                Setting up rooms, configuring audio/video, and preparing your workspace...
              </p>
            </div>
          </motion.div>
        )}

        {isPlaying && showOfficeView && (
          <motion.div
            key="office-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              height: '100%',
              padding: '20px'
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              height: '100%'
            }}>
              {demoRooms.map((room) => (
                <motion.div
                  key={room.id}
                  whileHover={{ scale: 1.05 }}
                  onHoverStart={() => setHoveredRoom(room.id)}
                  onHoverEnd={() => setHoveredRoom(null)}
                  onClick={() => handleRoomClick(room.id)}
                  style={{
                    ...getRoomStyle(room),
                    cursor: 'pointer',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                    {room.icon}
                  </div>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: '#ffffff'
                  }}>
                    {room.name}
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    marginBottom: '12px'
                  }}>
                    {room.participants} participants
                  </p>
                  {hoveredRoom === room.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        fontSize: '12px',
                        color: '#8b5cf6'
                      }}
                    >
                      Click to join
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {isPlaying && showRoomView && (
          <motion.div
            key="room-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Video Grid */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              padding: '20px'
            }}>
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: '150px'
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '8px'
                  }}>
                    {participant.avatar}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#ffffff'
                  }}>
                    {participant.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isVideoEnabled ? '#10b981' : '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                📹
              </button>
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isAudioEnabled ? '#10b981' : '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🎤
              </button>
              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isScreenSharing ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🖥️
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: showChat ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                💬
              </button>
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: showWhiteboard ? '#8b5cf6' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                📝
              </button>
            </div>

            {/* Chat Panel */}
            {showChat && (
              <motion.div
                initial={{ x: 300 }}
                animate={{ x: 0 }}
                exit={{ x: 300 }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  bottom: '100px',
                  width: '300px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }}>
                  Team Chat
                </div>
                <div style={{
                  flex: 1,
                  padding: '16px',
                  overflowY: 'auto'
                }}>
                  {messages.map((message, index) => (
                    <div key={index} style={{
                      marginBottom: '12px',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        color: '#8b5cf6',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                      }}>
                        {message.sender}
                      </div>
                      <div style={{ color: '#ffffff' }}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendDemoMessage()}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={sendDemoMessage}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#8b5cf6',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}