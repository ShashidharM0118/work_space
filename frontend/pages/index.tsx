import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    const id = uuidv4();
    router.push(`/room/${id}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Realtime Video Chat</h1>
      <div>
        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={createRoom}>Create New Room</button>
      </div>
    </div>
  );
} 