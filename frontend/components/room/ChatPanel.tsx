import React from 'react';

interface ChatMsg {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
}

interface Props {
  isMobile: boolean;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  messages: ChatMsg[];
  newMsg: string;
  setNewMsg: (v: string) => void;
  sendMessage: () => void;
  participants: any[];
  myId: React.MutableRefObject<string>;
}

const ChatPanel: React.FC<Props> = ({ isMobile, showChat, setShowChat, messages, newMsg, setNewMsg, sendMessage, participants, myId }) => {
  if (!showChat) return null;
  return (
    <div style={{ position: isMobile ? 'fixed' : 'relative', bottom: isMobile ? 0 : 'auto', right: 0, width: isMobile ? '100%' : 300, background: '#202124', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #5f6368', display: 'flex', justifyContent: 'space-between' }}>
        <span>Chat</span>
        <button onClick={() => setShowChat(false)}>✕</button>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ padding: '8px 12px', background: msg.sender === myId.current ? '#0F9D58' : '#3c4043', borderRadius: 12 }}>
            <div style={{ fontWeight: 600 }}>{msg.sender === myId.current ? 'You' : (participants.find(p => p.id === msg.sender)?.name || 'Unknown')}</div>
            <div>{msg.text}</div>
            {msg.timestamp && <div style={{ fontSize: 11, opacity: 0.7 }}>{msg.timestamp}</div>}
          </div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid #5f6368', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage} disabled={!newMsg.trim()}>Send</button>
      </div>
    </div>
  );
};

export default ChatPanel;
