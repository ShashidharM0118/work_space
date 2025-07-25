import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOfficeCreation, setShowOfficeCreation] = useState(false);
  const [showOfficeView, setShowOfficeView] = useState(false);
  const [showRoomView, setShowRoomView] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const demoSteps = [
    {
      title: "Create Your Virtual Office",
      description: "Start by creating a customized virtual office space for your team",
      component: "office-creation"
    },
    {
      title: "Navigate Your Office",
      description: "Explore different rooms and spaces within your virtual office",
      component: "office-view"
    },
    {
      title: "Join Video Meetings",
      description: "Experience seamless video conferencing with advanced collaboration tools",
      component: "room-view"
    }
  ];

  const demoRooms = [
    {
      id: 'main-hall',
      name: 'Main Hall',
      description: 'Welcome area for all participants',
      color: '#3b82f6',
      icon: '🏛️',
      position: { x: 40, y: 15 },
      size: { width: 20, height: 15 },
      participants: 3,
      maxParticipants: 20
    }, 
   {
      id: 'meeting-room-1',
      name: 'Meeting Room 1',
      description: 'Private meeting space',
      color: '#10b981',
      icon: '📋',
      position: { x: 10, y: 45 },
      size: { width: 18, height: 12 },
      participants: 2,
      maxParticipants: 8
    },
    {
      id: 'meeting-room-2',
      name: 'Meeting Room 2',
      description: 'Collaborative workspace',
      color: '#f59e0b',
      icon: '💼',
      position: { x: 70, y: 45 },
      size: { width: 18, height: 12 },
      participants: 1,
      maxParticipants: 8
    },
    {
      id: 'breakout-room',
      name: 'Breakout Room',
      description: 'Casual discussion area',
      color: '#8b5cf6',
      icon: '☕',
      position: { x: 40, y: 70 },
      size: { width: 20, height: 12 },
      participants: 0,
      maxParticipants: 6
    }
  ];

  const demoParticipants = [
    { id: '1', name: 'Alice Johnson', avatar: '👩‍💼', role: 'owner' },
    { id: '2', name: 'Bob Smith', avatar: '👨‍💻', role: 'member' },
    { id: '3', name: 'Carol Davis', avatar: '👩‍🎨', role: 'member' },
    { id: '4', name: 'David Wilson', avatar: '👨‍🔬', role: 'member' }
  ];

  const demoMessages = [
    { id: '1', sender: 'Alice Johnson', text: 'Welcome everyone to our team meeting!', timestamp: '10:30 AM' },
    { id: '2', sender: 'Bob Smith', text: 'Thanks for setting this up, Alice', timestamp: '10:31 AM' },
    { id: '3', sender: 'Carol Davis', text: 'The new design looks great! 🎨', timestamp: '10:32 AM' },
    { id: '4', sender: 'David Wilson', text: 'Agreed! Ready to discuss the implementation', timestamp: '10:33 AM' }
  ];  u
seEffect(() => {
    if (isPlaying && currentStep < demoSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep]);

  useEffect(() => {
    if (currentStep === 0) {
      setShowOfficeCreation(true);
      setShowOfficeView(false);
      setShowRoomView(false);
    } else if (currentStep === 1) {
      setShowOfficeCreation(false);
      setShowOfficeView(true);
      setShowRoomView(false);
    } else if (currentStep === 2) {
      setShowOfficeView(false);
      setShowRoomView(true);
      setParticipants(demoParticipants);
      setMessages(demoMessages);
    }
  }, [currentStep]);

  const startDemo = () => {
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setShowOfficeCreation(false);
    setShowOfficeView(false);
    setShowRoomView(false);
    setSelectedRoom(null);
    setParticipants([]);
    setMessages([]);
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId);
    setTimeout(() => {
      setCurrentStep(2);
    }, 1000);
  };

  const getRoomStyle = (room: any) => ({
    position: 'absolute' as const,
    left: `${room.position.x}%`,
    top: `${room.position.y}%`,
    width: `${room.size.width}%`,
    height: `${room.size.height}%`,
    backgroundColor: hoveredRoom === room.id ? room.color : `${room.color}20`,
    border: `2px solid ${room.color}`,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: hoveredRoom === room.id ? 'scale(1.02)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: hoveredRoom === room.id 
      ? `0 8px 25px ${room.color}40`
      : '0 2px 8px rgba(0,0,0,0.1)'
  });  co
nst sendDemoMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now().toString(),
      sender: 'You',
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '1200px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '800',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              NexOffice Demo
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#94a3b8',
              margin: 0
            }}>
              Experience the future of virtual collaboration
            </p>
          </div> 
         
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {!isPlaying ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startDemo}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ▶️ Start Demo
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetDemo}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  color: '#f1f5f9',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔄 Reset Demo
              </motion.button>
            )}
            
            <button
              onClick={onClose}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div> 
       {/* Progress Bar */}
        {isPlaying && (
          <div style={{
            padding: '0 32px 16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#94a3b8',
                fontWeight: '500'
              }}>
                Step {currentStep + 1} of {demoSteps.length}
              </span>
              <span style={{
                fontSize: '14px',
                color: '#3b82f6',
                fontWeight: '600'
              }}>
                {demoSteps[currentStep]?.title}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderRadius: '2px'
                }}
              />
            </div>
          </div>
        )}  
      {/* Demo Content */}
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
                
                <h3 style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  margin: '0 0 16px 0',
                  color: '#f1f5f9'
                }}>
                  Welcome to NexOffice
                </h3>
                
                <p style={{
                  fontSize: '18px',
                  color: '#94a3b8',
                  maxWidth: '600px',
                  lineHeight: '1.6',
                  marginBottom: '40px'
                }}>
                  Discover how NexOffice transforms remote work with virtual offices, 
                  seamless video conferencing, and powerful collaboration tools.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                  maxWidth: '800px',
                  width: '100%'
                }}>
                  {demoSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ y: -5 }}
                      style={{
                        padding: '24px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '16px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: '700',
                        margin: '0 auto 16px'
                      }}>
                        {index + 1}
                      </div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        color: '#f1f5f9'
                      }}>
                        {step.title}
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: '#94a3b8',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        {step.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}   
         {/* Office Creation Demo */}
            {showOfficeCreation && (
              <motion.div
                key="office-creation"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px'
                }}
              >
                <div style={{
                  maxWidth: '600px',
                  width: '100%'
                }}>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: '20px',
                      padding: '40px',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '32px'
                    }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        style={{
                          width: '80px',
                          height: '80px',
                          margin: '0 auto 24px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px'
                        }}
                      >
                        🏢
                      </motion.div>
                      
                      <h3 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        margin: '0 0 12px 0',
                        color: '#f1f5f9'
                      }}>
                        Create Your Office
                      </h3>
                      
                      <p style={{
                        fontSize: '16px',
                        color: '#94a3b8',
                        margin: 0
                      }}>
                        Set up your virtual workspace in seconds
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}>
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <label style={{
                          display: 'block',
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#f1f5f9'
                        }}>
                          Office Name
                        </label>
                        <motion.input
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ delay: 0.8, duration: 1 }}
                          type="text"
                          value="Acme Corp Virtual HQ"
                          readOnly
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(148, 163, 184, 0.1)',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                            fontSize: '16px',
                            outline: 'none'
                          }}
                        />
                      </motion.div>

                      <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1.4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          marginTop: '16px'
                        }}
                      >
                        Create Office 🚀
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )} 
           {/* Office View Demo */}
            {showOfficeView && (
              <motion.div
                key="office-view"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px'
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    flex: 1,
                    position: 'relative',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '16px',
                    border: '2px solid #cbd5e1',
                    overflow: 'hidden'
                  }}
                >
                  {/* Rooms */}
                  {demoRooms.map((room, index) => (
                    <motion.div
                      key={room.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.2 }}
                      style={getRoomStyle(room)}
                      onMouseEnter={() => setHoveredRoom(room.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      onClick={() => handleRoomClick(room.id)}
                    >
                      <motion.div
                        animate={{ 
                          scale: hoveredRoom === room.id ? [1, 1.2, 1] : 1,
                          rotate: hoveredRoom === room.id ? [0, 10, -10, 0] : 0
                        }}
                        transition={{ duration: 0.5 }}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: room.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          marginBottom: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        {room.icon}
                      </motion.div>
                      
                      <h3 style={{
                        color: hoveredRoom === room.id ? room.color : '#1e293b',
                        margin: '0 0 6px 0',
                        fontSize: '16px',
                        fontWeight: '700',
                        textAlign: 'center'
                      }}>
                        {room.name}
                      </h3>
                      
                      <motion.div
                        animate={{ 
                          backgroundColor: hoveredRoom === room.id ? room.color : '#f1f5f9'
                        }}
                        style={{
                          padding: '6px 12px',
                          color: hoveredRoom === room.id ? 'white' : '#475569',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: '600',
                          border: `1px solid ${hoveredRoom === room.id ? room.color : '#e2e8f0'}`
                        }}
                      >
                        {room.participants}/{room.maxParticipants} participants
                      </motion.div>
                    </motion.div>
                  ))}

                  {/* Floating Instruction */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 2 }}
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '12px 24px',
                      backgroundColor: 'rgba(59, 130, 246, 0.9)',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    👆 Click on any room to join the meeting
                  </motion.div>
                </motion.div>
              </motion.div>
            )}      
      {/* Room View Demo */}
            {showRoomView && (
              <motion.div
                key="room-view"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#0f2027'
                }}
              >
                {/* Video Area */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '20px',
                  gap: '16px'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    width: '100%',
                    maxWidth: '800px'
                  }}>
                    {/* Your Video */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{
                        position: 'relative',
                        backgroundColor: '#1a4a3b',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '2px solid #0f9d58',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        aspectRatio: '16/9'
                      }}
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 2, -2, 0]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          backgroundColor: '#0f9d58',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '36px',
                          color: 'white'
                        }}
                      >
                        👤
                      </motion.div>
                      
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        You
                      </div>
                    </motion.div>

                    {/* Participant Videos */}
                    {participants.slice(0, 3).map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.6 + index * 0.2 }}
                        style={{
                          position: 'relative',
                          backgroundColor: '#1a4a3b',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          border: '2px solid #0f9d58',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          aspectRatio: '16/9'
                        }}
                      >
                        <motion.div
                          animate={{ 
                            scale: [1, 1.05, 1],
                            y: [0, -5, 0]
                          }}
                          transition={{ 
                            duration: 2 + index * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          style={{
                            fontSize: '48px'
                          }}
                        >
                          {participant.avatar}
                        </motion.div>
                        
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {participant.name.split(' ')[0]}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Control Bar */}
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  style={{
                    padding: '20px',
                    background: 'rgba(32, 33, 36, 0.95)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                >
                  <button style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: isAudioEnabled ? 'rgba(255, 255, 255, 0.1)' : '#ea4335',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    🎤
                  </button>
                  
                  <button style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: isVideoEnabled ? 'rgba(255, 255, 255, 0.1)' : '#ea4335',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    📹
                  </button>
                  
                  <button style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#ea4335',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    📞
                  </button>
                  
                  <button style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    💬
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Demo Description */}
        {isPlaying && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              padding: '20px 32px',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              backgroundColor: 'rgba(30, 41, 59, 0.5)'
            }}
          >
            <h4 style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              color: '#f1f5f9'
            }}>
              {demoSteps[currentStep]?.title}
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {demoSteps[currentStep]?.description}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}