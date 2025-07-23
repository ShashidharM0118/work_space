from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import logging
import uuid
from datetime import datetime
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, db as firebase_db
    import pyrebase
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    credentials = None
    firestore = None
    firebase_db = None
    pyrebase = None
    FIREBASE_AVAILABLE = False
    print("⚠️  Firebase not available - running without Firebase integration")
import os
import asyncio
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Virtual Office WebSocket Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "firebase": FIREBASE_INITIALIZED}

# Initialize Firebase with Realtime Database
FIREBASE_INITIALIZED = False
firebase_ref = None

if FIREBASE_AVAILABLE:
    try:
        if not firebase_admin._apps:
            # Initialize Firebase with Realtime Database URL
            # You can add Firebase credentials here if needed
            # cred = credentials.Certificate("path/to/serviceAccountKey.json")
            # firebase_admin.initialize_app(cred, {
            #     'databaseURL': 'https://your-project-default-rtdb.firebaseio.com/'
            # })
            logger.info("Firebase Admin SDK ready (configure with credentials for full functionality)")
        
        # Try to get database reference (will work if properly configured)
        try:
            firebase_ref = firebase_db.reference('/')
            FIREBASE_INITIALIZED = True
            logger.info("✅ Firebase Realtime Database connected")
        except Exception as db_error:
            logger.warning(f"Firebase Realtime Database not configured: {db_error}")
            
    except Exception as e:
        logger.warning(f"Firebase not initialized: {e}")
else:
    logger.info("Firebase integration disabled - running in standalone mode")

class FirebaseParticipantManager:
    """Manages participant data in Firebase Realtime Database"""
    
    def __init__(self):
        self.use_firebase = FIREBASE_INITIALIZED and firebase_ref is not None
        self.fallback_data = {}  # Fallback to memory if Firebase unavailable
        
    async def add_participant(self, office_id: str, room_id: str, user_data: dict):
        """Add participant to Firebase or fallback storage"""
        try:
            if self.use_firebase:
                # Store in Firebase Realtime Database
                participant_ref = firebase_ref.child('offices').child(office_id).child('rooms').child(room_id).child('participants').child(user_data['id'])
                participant_ref.set({
                    **user_data,
                    'joined_at': user_data.get('joined_at', datetime.now().isoformat()),
                    'last_seen': datetime.now().isoformat(),
                    'office_id': office_id,
                    'room_id': room_id
                })
                logger.info(f"✅ Added participant {user_data['name']} to Firebase: {office_id}/{room_id}")
            else:
                # Fallback to memory
                if office_id not in self.fallback_data:
                    self.fallback_data[office_id] = {}
                if room_id not in self.fallback_data[office_id]:
                    self.fallback_data[office_id][room_id] = {}
                self.fallback_data[office_id][room_id][user_data['id']] = {
                    **user_data,
                    'joined_at': user_data.get('joined_at', datetime.now().isoformat()),
                    'last_seen': datetime.now().isoformat(),
                    'office_id': office_id,
                    'room_id': room_id
                }
                logger.info(f"📝 Added participant {user_data['name']} to memory: {office_id}/{room_id}")
        except Exception as e:
            logger.error(f"❌ Failed to add participant: {e}")
    
    async def remove_participant(self, office_id: str, room_id: str, user_id: str):
        """Remove participant from Firebase or fallback storage"""
        try:
            if self.use_firebase:
                participant_ref = firebase_ref.child('offices').child(office_id).child('rooms').child(room_id).child('participants').child(user_id)
                participant_ref.delete()
                logger.info(f"🗑️ Removed participant {user_id} from Firebase: {office_id}/{room_id}")
            else:
                # Fallback to memory
                if (office_id in self.fallback_data and 
                    room_id in self.fallback_data[office_id] and 
                    user_id in self.fallback_data[office_id][room_id]):
                    del self.fallback_data[office_id][room_id][user_id]
                    logger.info(f"🗑️ Removed participant {user_id} from memory: {office_id}/{room_id}")
        except Exception as e:
            logger.error(f"❌ Failed to remove participant: {e}")
    
    async def get_office_participants(self, office_id: str) -> dict:
        """Get all participants in an office grouped by room"""
        try:
            if self.use_firebase:
                office_ref = firebase_ref.child('offices').child(office_id).child('rooms')
                office_data = office_ref.get()
                
                if not office_data:
                    return {}
                
                rooms = {}
                for room_id, room_data in office_data.items():
                    participants = room_data.get('participants', {})
                    # Convert dict to list and clean data
                    rooms[room_id] = [
                        {k: v for k, v in participant.items() if k != 'websocket'}
                        for participant in participants.values()
                    ] if participants else []
                
                return rooms
            else:
                # Fallback to memory
                if office_id not in self.fallback_data:
                    return {}
                
                rooms = {}
                for room_id, participants in self.fallback_data[office_id].items():
                    rooms[room_id] = [
                        {k: v for k, v in participant.items() if k != 'websocket'}
                        for participant in participants.values()
                    ]
                
                return rooms
        except Exception as e:
            logger.error(f"❌ Failed to get office participants: {e}")
            return {}
    
    async def update_participant_activity(self, office_id: str, room_id: str, user_id: str):
        """Update participant's last seen timestamp"""
        try:
            if self.use_firebase:
                participant_ref = firebase_ref.child('offices').child(office_id).child('rooms').child(room_id).child('participants').child(user_id)
                participant_ref.child('last_seen').set(datetime.now().isoformat())
            else:
                # Fallback to memory
                if (office_id in self.fallback_data and 
                    room_id in self.fallback_data[office_id] and 
                    user_id in self.fallback_data[office_id][room_id]):
                    self.fallback_data[office_id][room_id][user_id]['last_seen'] = datetime.now().isoformat()
        except Exception as e:
            logger.error(f"❌ Failed to update participant activity: {e}")

# Initialize Firebase participant manager
firebase_participants = FirebaseParticipantManager()

class ConnectionManager:
    """Stores active WebSocket connections grouped by room id"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.room_participants: Dict[str, Dict[str, dict]] = {}  # room_id -> {user_id: user_info}
        self.office_participants: Dict[str, Dict[str, dict]] = {}  # office_id -> {user_id: user_info}
        self.user_to_office: Dict[str, str] = {}  # user_id -> office_id
        self.user_to_room: Dict[str, str] = {}  # user_id -> room_id

    async def connect(self, room_id: str, websocket: WebSocket, user_info: dict = None):
        # Note: WebSocket should already be accepted before calling this method
        self.active_connections.setdefault(room_id, []).append(websocket)
        
        # Store user info
        if user_info:
            user_id = user_info.get('id', str(uuid.uuid4()))
            office_id = user_info.get('office_id', 'default')
            
            # Store in room participants (local for WebSocket management)
            self.room_participants.setdefault(room_id, {})[user_id] = {
                **user_info,
                'websocket': websocket,
                'joined_at': datetime.now().isoformat(),
                'room_id': room_id
            }
            
            # Store in office participants (local for WebSocket management)
            self.office_participants.setdefault(office_id, {})[user_id] = {
                **user_info,
                'websocket': websocket,
                'joined_at': datetime.now().isoformat(),
                'room_id': room_id,
                'current_room': room_id
            }
            
            # Update mappings
            self.user_to_office[user_id] = office_id
            self.user_to_room[user_id] = room_id
            
            # Store in Firebase Realtime Database
            await firebase_participants.add_participant(office_id, room_id, user_info)
        
        logger.info(f"✅ New connection to room {room_id}. Total in room: {len(self.active_connections[room_id])}")
        
        # Notify other participants about the new user
        if user_info:
            await self.broadcast(room_id, {
                'type': 'user_joined',
                'user': user_info,
                'participants_count': len(self.room_participants.get(room_id, {}))
            }, exclude_websocket=websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        room = self.active_connections.get(room_id)
        if room and websocket in room:
            room.remove(websocket)
            
            # Remove user from participants
            participants = self.room_participants.get(room_id, {})
            user_to_remove = None
            for user_id, user_data in participants.items():
                if user_data.get('websocket') == websocket:
                    user_to_remove = user_id
                    break
            
            if user_to_remove:
                user_info = participants.pop(user_to_remove, {})
                
                # Remove from Firebase
                office_id = self.user_to_office.get(user_to_remove, 'default')
                asyncio.create_task(firebase_participants.remove_participant(office_id, room_id, user_to_remove))
                
                # Clean up mappings
                self.user_to_office.pop(user_to_remove, None)
                self.user_to_room.pop(user_to_remove, None)
                
                # Notify other participants about user leaving
                if room:  # If there are still connections
                    asyncio.create_task(self.broadcast(room_id, {
                        'type': 'user_left',
                        'user_id': user_to_remove,
                        'participants_count': len(participants)
                    }))
            
            logger.info(f"❌ Disconnection from room {room_id}. Remaining in room: {len(room)}")
            
            if not room:
                # Clean up empty room
                del self.active_connections[room_id]
                if room_id in self.room_participants:
                    del self.room_participants[room_id]
                logger.info(f"🧹 Room {room_id} is now empty and removed")

    async def broadcast(self, room_id: str, message: dict, exclude_websocket: WebSocket = None):
        logger.info(f"📡 Broadcasting to room {room_id}: {message.get('type', 'unknown')} message")
        connections = self.active_connections.get(room_id, [])
        
        for connection in connections:
            if exclude_websocket and connection == exclude_websocket:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to connection: {e}")
                # Remove broken connection
                if connection in connections:
                    connections.remove(connection)

    def get_room_participants(self, room_id: str) -> List[dict]:
        participants = self.room_participants.get(room_id, {})
        return [
            {k: v for k, v in user_data.items() if k != 'websocket'}
            for user_data in participants.values()
        ]
    
    def get_office_participants(self, office_id: str) -> Dict[str, List[dict]]:
        """Get all participants in an office grouped by room"""
        office_participants = self.office_participants.get(office_id, {})
        rooms = {}
        
        for user_id, user_data in office_participants.items():
            room_id = user_data.get('current_room', 'unknown')
            if room_id not in rooms:
                rooms[room_id] = []
            
            # Clean user data (remove websocket)
            clean_user_data = {k: v for k, v in user_data.items() if k != 'websocket'}
            rooms[room_id].append(clean_user_data)
        
        return rooms
    
    async def broadcast_to_office(self, office_id: str, message: dict, exclude_websocket: WebSocket = None):
        """Broadcast message to all participants in an office"""
        office_participants = self.office_participants.get(office_id, {})
        
        for user_data in office_participants.values():
            websocket = user_data.get('websocket')
            if websocket and websocket != exclude_websocket:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"❌ Failed to send office message to connection: {e}")
    
    async def move_user_to_room(self, user_id: str, new_room_id: str):
        """Move a user from one room to another while keeping office connection"""
        if user_id not in self.user_to_office:
            return False
        
        office_id = self.user_to_office[user_id]
        old_room_id = self.user_to_room.get(user_id)
        
        # Update office participant record
        if office_id in self.office_participants and user_id in self.office_participants[office_id]:
            self.office_participants[office_id][user_id]['current_room'] = new_room_id
            self.user_to_room[user_id] = new_room_id
        
        # Notify office participants about room change
        await self.broadcast_to_office(office_id, {
            'type': 'user_moved_room',
            'user_id': user_id,
            'from_room': old_room_id,
            'to_room': new_room_id,
            'office_participants': self.get_office_participants(office_id)
        })
        
        return True

manager = ConnectionManager()

# Pydantic models
class InviteRequest(BaseModel):
    office_id: str
    room_id: str
    inviter_name: str
    inviter_email: str
    invitee_email: str
    message: Optional[str] = None

class OfficeInfo(BaseModel):
    office_id: str
    name: str
    description: str
    created_at: str
    owner_id: str

@app.get("/")
async def healthcheck():
    logger.info("🏥 Health check requested")
    return {
        "status": "ok",
        "service": "Virtual Office WebSocket Server",
        "version": "1.0.0",
        "active_rooms": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values())
    }

@app.get("/rooms/{room_id}/participants")
async def get_room_participants(room_id: str):
    """Get list of participants in a room"""
    participants = manager.get_room_participants(room_id)
    return {
        "room_id": room_id,
        "participants": participants,
        "count": len(participants)
    }

@app.get("/offices/{office_id}/participants")
async def get_office_participants(office_id: str):
    """Get all participants in an office grouped by room"""
    rooms_with_participants = await firebase_participants.get_office_participants(office_id)
    total_participants = sum(len(participants) for participants in rooms_with_participants.values())
    
    return {
        "office_id": office_id,
        "rooms": rooms_with_participants,
        "total_participants": total_participants,
        "active_rooms": len([room for room, participants in rooms_with_participants.items() if participants])
    }

@app.post("/invite")
async def send_invitation(invite: InviteRequest):
    """Send email invitation to join a room"""
    try:
        # Here you would integrate with your email service
        # For now, we'll just log the invitation
        logger.info(f"📧 Invitation sent from {invite.inviter_email} to {invite.invitee_email}")
        logger.info(f"   Office: {invite.office_id}, Room: {invite.room_id}")
        
        # In a real implementation, you would:
        # 1. Generate a unique invitation link
        # 2. Send email using SendGrid, Firebase, or another service
        # 3. Store invitation in database for tracking
        
        invitation_link = f"https://your-app.com/office/{invite.office_id}?room={invite.room_id}&invited=true"
        
        # TODO: Implement actual email sending
        # send_email(
        #     to=invite.invitee_email,
        #     subject=f"Join {invite.inviter_name}'s virtual office",
        #     template="invitation",
        #     data={
        #         "inviter_name": invite.inviter_name,
        #         "invitation_link": invitation_link,
        #         "message": invite.message
        #     }
        # )
        
        return {
            "success": True,
            "message": "Invitation sent successfully",
            "invitation_link": invitation_link
        }
    except Exception as e:
        logger.error(f"❌ Failed to send invitation: {e}")
        raise HTTPException(status_code=500, detail="Failed to send invitation")

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """Handle WebSocket connections for real-time communication in rooms"""
    logger.info(f"🔗 WebSocket connection attempt for room: {room_id}")
    
    # Accept connection first
    await websocket.accept()
    
    # Wait for initial user info
    try:
        initial_data = await websocket.receive_json()
        user_info = None
        
        if initial_data.get('type') == 'join':
            user_info = {
                'id': initial_data.get('id', str(uuid.uuid4())),
                'name': initial_data.get('name', 'Anonymous'),
                'email': initial_data.get('email', ''),
                'avatar': initial_data.get('avatar', ''),
                'firebaseUid': initial_data.get('firebaseUid', ''),
                'displayName': initial_data.get('displayName', ''),
                'office_id': initial_data.get('office_id', 'default'),
                'role': initial_data.get('role', 'member'),
            }
            logger.info(f"👤 User {user_info['name']} (Firebase: {user_info['firebaseUid']}) joining room {room_id}")
    except Exception as e:
        logger.error(f"❌ Failed to receive initial data: {e}")
        await websocket.close()
        return
    
    # Use the proper connection manager with office tracking
    await manager.connect(room_id, websocket, user_info)
    
    if user_info:
        # Send current participants to new user
        await websocket.send_json({
            'type': 'participants_list',
            'participants': manager.get_room_participants(room_id)
        })
    
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"📥 Received from room {room_id}: {data.get('type', 'unknown')} message")
            
            # Add sender info if not present
            if user_info and 'sender' not in data:
                data['sender'] = user_info['id']
            
            # Broadcast to all other participants
            await manager.broadcast(room_id, data, exclude_websocket=websocket)
            
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected from room: {room_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error in room {room_id}: {e}")
    finally:
        manager.disconnect(room_id, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 