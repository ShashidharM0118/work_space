import logging
import uuid
import asyncio
from datetime import datetime
from typing import Dict, List

import firebase_admin
from firebase_admin import credentials, db as firebase_db
from fastapi import WebSocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase initialization
FIREBASE_INITIALIZED = False
firebase_ref = None

try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://typio-57fa9.firebaseio.com'
    })
    logger.info("Firebase Admin SDK initialized successfully")

    try:
        firebase_ref = firebase_db.reference('/')
        FIREBASE_INITIALIZED = True
        logger.info("✅ Firebase Realtime Database connected")
    except Exception as db_error:
        logger.warning(f"Firebase Realtime Database not configured: {db_error}")
except Exception as e:
    logger.warning(f"Firebase not initialized: {e}")


class FirebaseParticipantManager:
    """Manage participant data in Firebase Realtime Database."""

    def __init__(self):
        self.use_firebase = FIREBASE_INITIALIZED and firebase_ref is not None
        self.fallback_data = {}

    async def add_participant(self, office_id: str, room_id: str, user_data: dict):
        try:
            if self.use_firebase:
                participant_ref = (firebase_ref.child('offices')
                                               .child(office_id)
                                               .child('rooms')
                                               .child(room_id)
                                               .child('participants')
                                               .child(user_data['id']))
                participant_ref.set({
                    **user_data,
                    'joined_at': user_data.get('joined_at', datetime.now().isoformat()),
                    'last_seen': datetime.now().isoformat(),
                    'office_id': office_id,
                    'room_id': room_id
                })
                logger.info(f"✅ Added participant {user_data['name']} to Firebase: {office_id}/{room_id}")
            else:
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
        try:
            if self.use_firebase:
                participant_ref = (firebase_ref.child('offices')
                                               .child(office_id)
                                               .child('rooms')
                                               .child(room_id)
                                               .child('participants')
                                               .child(user_id))
                participant_ref.delete()
                logger.info(f"🗑️ Removed participant {user_id} from Firebase: {office_id}/{room_id}")
            else:
                if (office_id in self.fallback_data and
                        room_id in self.fallback_data[office_id] and
                        user_id in self.fallback_data[office_id][room_id]):
                    del self.fallback_data[office_id][room_id][user_id]
                    logger.info(f"🗑️ Removed participant {user_id} from memory: {office_id}/{room_id}")
        except Exception as e:
            logger.error(f"❌ Failed to remove participant: {e}")

    async def get_office_participants(self, office_id: str) -> dict:
        try:
            if self.use_firebase:
                office_ref = firebase_ref.child('offices').child(office_id).child('rooms')
                office_data = office_ref.get()
                if not office_data:
                    return {}

                rooms = {}
                for room_id, room_data in office_data.items():
                    participants = room_data.get('participants', {})
                    rooms[room_id] = [
                        {k: v for k, v in participant.items() if k != 'websocket'}
                        for participant in participants.values()
                    ] if participants else []
                return rooms
            else:
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
        try:
            if self.use_firebase:
                participant_ref = (firebase_ref.child('offices')
                                               .child(office_id)
                                               .child('rooms')
                                               .child(room_id)
                                               .child('participants')
                                               .child(user_id))
                participant_ref.child('last_seen').set(datetime.now().isoformat())
            else:
                if (office_id in self.fallback_data and
                        room_id in self.fallback_data[office_id] and
                        user_id in self.fallback_data[office_id][room_id]):
                    self.fallback_data[office_id][room_id][user_id]['last_seen'] = datetime.now().isoformat()
        except Exception as e:
            logger.error(f"❌ Failed to update participant activity: {e}")


firebase_participants = FirebaseParticipantManager()


class ConnectionManager:
    """Store active WebSocket connections grouped by room id."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.room_participants: Dict[str, Dict[str, dict]] = {}
        self.office_participants: Dict[str, Dict[str, dict]] = {}
        self.user_to_office: Dict[str, str] = {}
        self.user_to_room: Dict[str, str] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_info: dict | None = None):
        self.active_connections.setdefault(room_id, []).append(websocket)
        if user_info:
            user_id = user_info.get('id', str(uuid.uuid4()))
            office_id = user_info.get('office_id', 'default')
            self.room_participants.setdefault(room_id, {})[user_id] = {
                **user_info,
                'websocket': websocket,
                'joined_at': datetime.now().isoformat(),
                'room_id': room_id
            }
            self.office_participants.setdefault(office_id, {})[user_id] = {
                **user_info,
                'websocket': websocket,
                'joined_at': datetime.now().isoformat(),
                'room_id': room_id,
                'current_room': room_id
            }
            self.user_to_office[user_id] = office_id
            self.user_to_room[user_id] = room_id
            await firebase_participants.add_participant(office_id, room_id, user_info)
        logger.info(f"✅ New connection to room {room_id}. Total in room: {len(self.active_connections[room_id])}")
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
            participants = self.room_participants.get(room_id, {})
            user_to_remove = None
            for user_id, user_data in participants.items():
                if user_data.get('websocket') == websocket:
                    user_to_remove = user_id
                    break
            if user_to_remove:
                participants.pop(user_to_remove, None)
                office_id = self.user_to_office.get(user_to_remove, 'default')
                asyncio.create_task(firebase_participants.remove_participant(office_id, room_id, user_to_remove))
                self.user_to_office.pop(user_to_remove, None)
                self.user_to_room.pop(user_to_remove, None)
                if room:
                    asyncio.create_task(self.broadcast(room_id, {
                        'type': 'user_left',
                        'user_id': user_to_remove,
                        'participants_count': len(participants)
                    }))
            logger.info(f"❌ Disconnection from room {room_id}. Remaining in room: {len(room)}")
            if not room:
                del self.active_connections[room_id]
                if room_id in self.room_participants:
                    del self.room_participants[room_id]
                logger.info(f"🧹 Room {room_id} is now empty and removed")

    async def broadcast(self, room_id: str, message: dict, exclude_websocket: WebSocket | None = None):
        logger.info(f"📡 Broadcasting to room {room_id}: {message.get('type', 'unknown')} message")
        connections = self.active_connections.get(room_id, [])
        for connection in connections:
            if exclude_websocket and connection == exclude_websocket:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to connection: {e}")
                if connection in connections:
                    connections.remove(connection)

    def get_room_participants(self, room_id: str) -> List[dict]:
        participants = self.room_participants.get(room_id, {})
        return [
            {k: v for k, v in user_data.items() if k != 'websocket'}
            for user_data in participants.values()
        ]

    def get_office_participants(self, office_id: str) -> Dict[str, List[dict]]:
        office_participants = self.office_participants.get(office_id, {})
        rooms: Dict[str, List[dict]] = {}
        for user_id, user_data in office_participants.items():
            room_id = user_data.get('current_room', 'unknown')
            if room_id not in rooms:
                rooms[room_id] = []
            clean_user_data = {k: v for k, v in user_data.items() if k != 'websocket'}
            rooms[room_id].append(clean_user_data)
        return rooms

    async def broadcast_to_office(self, office_id: str, message: dict, exclude_websocket: WebSocket | None = None):
        office_participants = self.office_participants.get(office_id, {})
        for user_data in office_participants.values():
            websocket = user_data.get('websocket')
            if websocket and websocket != exclude_websocket:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"❌ Failed to send office message to connection: {e}")

    async def move_user_to_room(self, user_id: str, new_room_id: str):
        if user_id not in self.user_to_office:
            return False
        office_id = self.user_to_office[user_id]
        old_room_id = self.user_to_room.get(user_id)
        if office_id in self.office_participants and user_id in self.office_participants[office_id]:
            self.office_participants[office_id][user_id]['current_room'] = new_room_id
            self.user_to_room[user_id] = new_room_id
        await self.broadcast_to_office(office_id, {
            'type': 'user_moved_room',
            'user_id': user_id,
            'from_room': old_room_id,
            'to_room': new_room_id,
            'office_participants': self.get_office_participants(office_id)
        })
        return True

manager = ConnectionManager()
