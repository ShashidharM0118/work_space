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