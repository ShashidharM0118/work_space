import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User } from "firebase/auth";
import { getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setDoc, getDoc, getDocs, limit, Timestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB39qm8EN6MJQqIhKpLUSRLNKDhhTCE8aA",
  authDomain: "typio-57fa9.firebaseapp.com",
  projectId: "typio-57fa9",
  storageBucket: "typio-57fa9.firebasestorage.app",
  messagingSenderId: "172519754508",
  appId: "1:172519754508:web:898f3afc8a28b21094d729",
  measurementId: "G-FZRJ65M4FK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let analytics: any;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    // First try popup method
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Successfully signed in:', result.user.email);
    
    // Create or update user profile
    await createOrUpdateUserProfile(result.user);
    
    return result;
  } catch (error: any) {
    console.error('❌ Firebase Auth Error:', {
      code: error.code,
      message: error.message,
      details: error
    });
    
    // Handle Cross-Origin-Opener-Policy and popup issues
    if (error.code === 'auth/popup-blocked' || 
        error.code === 'auth/popup-closed-by-user' ||
        error.message.includes('Cross-Origin-Opener-Policy') ||
        error.message.includes('opener')) {
      console.log('🔄 Popup blocked, falling back to redirect method...');
      
      try {
        // Fallback to redirect method
        await signInWithRedirect(auth, googleProvider);
        return null; // Redirect will handle the rest
      } catch (redirectError: any) {
        console.error('❌ Redirect auth also failed:', redirectError);
        throw redirectError;
      }
    }
    
    // Enhanced error logging for debugging
    if (error.code === 'auth/unauthorized-domain') {
      console.error('🔧 Fix: Add the following domains to Firebase Console → Authentication → Settings → Authorized domains:');
      console.error('  - localhost');
      console.error('  - 127.0.0.1');
      console.error(`  - ${window.location.hostname}`);
      console.error(`  - ${window.location.origin}`);
    }
    
    throw error;
  }
};

// Handle redirect result (for when popup fails and we use redirect)
export const handleAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('✅ Successfully signed in via redirect:', result.user.email);
      await createOrUpdateUserProfile(result.user);
      return result;
    }
    return null;
  } catch (error: any) {
    console.error('❌ Redirect result error:', error);
    throw error;
  }
};

export const signOutUser = () => signOut(auth);

// User Profile Management
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  lastActiveAt: string;
  totalRoomsJoined: number;
  totalOfficesOwned: number;
}

export const createOrUpdateUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const now = new Date().toISOString();
    
    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        lastActiveAt: now,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } else {
      // Create new user profile
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: now,
        lastActiveAt: now,
        totalRoomsJoined: 0,
        totalOfficesOwned: 0
      };
      await setDoc(userRef, newProfile);
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
  }
};

// Room Membership Management
export interface RoomMembership {
  roomId: string;
  roomName: string;
  officeId: string;
  officeName: string;
  joinedAt: string;
  lastActiveAt: string;
  role: 'owner' | 'member' | 'guest';
  isActive: boolean;
}

export interface UserRooms {
  userId: string;
  recentRooms: RoomMembership[];
  ownedOffices: string[];
  memberOffices: string[];
  totalRoomsJoined: number;
  lastUpdatedAt: string;
}

export const joinRoom = async (userId: string, roomId: string, roomName: string, officeId: string, officeName: string, role: 'owner' | 'member' | 'guest' = 'member') => {
  try {
    const now = new Date().toISOString();
    
    // Update user rooms
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    let userRooms: UserRooms;
    
    if (userRoomsSnap.exists()) {
      userRooms = userRoomsSnap.data() as UserRooms;
    } else {
      userRooms = {
        userId,
        recentRooms: [],
        ownedOffices: [],
        memberOffices: [],
        totalRoomsJoined: 0,
        lastUpdatedAt: now
      };
    }
    
    // Remove existing entry for this room if exists
    userRooms.recentRooms = userRooms.recentRooms.filter(room => room.roomId !== roomId);
    
    // Add new room to the beginning
    const newMembership: RoomMembership = {
      roomId,
      roomName,
      officeId,
      officeName,
      joinedAt: now,
      lastActiveAt: now,
      role,
      isActive: true
    };
    
    userRooms.recentRooms.unshift(newMembership);
    
    // Keep only last 20 rooms
    userRooms.recentRooms = userRooms.recentRooms.slice(0, 20);
    
    // Update office lists
    if (role === 'owner' && !userRooms.ownedOffices.includes(officeId)) {
      userRooms.ownedOffices.push(officeId);
    } else if (role !== 'owner' && !userRooms.memberOffices.includes(officeId)) {
      userRooms.memberOffices.push(officeId);
    }
    
    userRooms.totalRoomsJoined += 1;
    userRooms.lastUpdatedAt = now;
    
    await setDoc(userRoomsRef, userRooms);
    
    // Update room members
    const roomMembersRef = doc(db, 'roomMembers', roomId);
    const roomMembersSnap = await getDoc(roomMembersRef);
    
    let roomMembers: any = {};
    if (roomMembersSnap.exists()) {
      roomMembers = roomMembersSnap.data();
    }
    
    roomMembers[userId] = {
      userId,
      joinedAt: now,
      lastActiveAt: now,
      role
    };
    
    await setDoc(roomMembersRef, roomMembers);
    
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

export const getRecentRooms = async (userId: string, limitCount: number = 10): Promise<RoomMembership[]> => {
  try {
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    if (userRoomsSnap.exists()) {
      const data = userRoomsSnap.data() as UserRooms;
      return data.recentRooms.filter(room => room.isActive).slice(0, limitCount);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting recent rooms:', error);
    return [];
  }
};

export const getOwnedOffices = async (userId: string): Promise<string[]> => {
  try {
    const userRoomsRef = doc(db, 'userRooms', userId);
    const userRoomsSnap = await getDoc(userRoomsRef);
    
    if (userRoomsSnap.exists()) {
      const data = userRoomsSnap.data() as UserRooms;
      return data.ownedOffices || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting owned offices:', error);
    return [];
  }
};

export const subscribeToUserRooms = (userId: string, callback: (userRooms: UserRooms | null) => void) => {
  const userRoomsRef = doc(db, 'userRooms', userId);
  
  return onSnapshot(userRoomsRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserRooms);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to user rooms:', error);
    callback(null);
  });
};

// Office Management
export interface Office {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  rooms: Room[];
  isPublic: boolean;
  settings: {
    maxParticipants: number;
    allowGuests: boolean;
    requireApproval: boolean;
  };
}

export interface Room {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  participants: number;
  maxParticipants: number;
  isCustom: boolean;
  createdAt: string;
  officeId: string;
}

// Generate unique IDs
export const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
};

export const generateOfficeId = () => {
  return `office-${generateUniqueId()}`;
};

export const generateRoomId = (officeId: string) => {
  return `${officeId}-room-${generateUniqueId()}`;
};

// Create unique office with rooms
export const createOffice = async (name: string, description: string, ownerId: string, ownerName: string) => {
  try {
    const officeId = generateOfficeId();
    const now = new Date().toISOString();
    
    // Create default rooms with unique IDs
    const defaultRooms: Room[] = [
      {
        id: generateRoomId(officeId),
        name: 'Main Hall',
        description: 'Welcome area for all participants',
        color: '#0052CC',
        icon: '🏛️',
        position: { x: 40, y: 15 },
        size: { width: 20, height: 15 },
        participants: 0,
        maxParticipants: 20,
        isCustom: false,
        createdAt: now,
        officeId
      },
      {
        id: generateRoomId(officeId),
        name: 'Meeting Room 1',
        description: 'Private meeting space',
        color: '#00875A',
        icon: '📋',
        position: { x: 10, y: 45 },
        size: { width: 18, height: 12 },
        participants: 0,
        maxParticipants: 8,
        isCustom: false,
        createdAt: now,
        officeId
      },
      {
        id: generateRoomId(officeId),
        name: 'Meeting Room 2',
        description: 'Collaborative workspace',
        color: '#BF2600',
        icon: '💼',
        position: { x: 70, y: 45 },
        size: { width: 18, height: 12 },
        participants: 0,
        maxParticipants: 8,
        isCustom: false,
        createdAt: now,
        officeId
      },
      {
        id: generateRoomId(officeId),
        name: 'Breakout Room',
        description: 'Casual discussion area',
        color: '#6B46C1',
        icon: '☕',
        position: { x: 40, y: 70 },
        size: { width: 20, height: 12 },
        participants: 0,
        maxParticipants: 6,
        isCustom: false,
        createdAt: now,
        officeId
      }
    ];
    
    const newOffice: Office = {
      id: officeId,
      name,
      description,
      ownerId,
      ownerName,
      createdAt: now,
      rooms: defaultRooms,
      isPublic: true,
      settings: {
        maxParticipants: 50,
        allowGuests: true,
        requireApproval: false
      }
    };
    
    // Save office to Firestore
    const officeRef = doc(db, 'offices', officeId);
    await setDoc(officeRef, newOffice);
    
    // Update user's owned offices
    await joinRoom(ownerId, defaultRooms[0].id, defaultRooms[0].name, officeId, name, 'owner');
    
    return { office: newOffice, officeId };
  } catch (error) {
    console.error('Error creating office:', error);
    throw error;
  }
};

// Email Invitation System
export interface EmailInvitation {
  id: string;
  officeId: string;
  roomId: string;
  inviterUserId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  message?: string;
  invitationLink: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
}

export const sendEmailInvitation = async (
  officeId: string,
  roomId: string,
  inviterUserId: string,
  inviterName: string,
  inviterEmail: string,
  inviteeEmail: string,
  message?: string
) => {
  try {
    const invitationId = generateUniqueId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const invitationLink = `${window.location.origin}/office/${officeId}?room=${roomId}&invitation=${invitationId}`;
    
    const invitation: EmailInvitation = {
      id: invitationId,
      officeId,
      roomId,
      inviterUserId,
      inviterName,
      inviterEmail,
      inviteeEmail,
      message,
      invitationLink,
      createdAt: now.toISOString(),
      status: 'pending',
      expiresAt: expiresAt.toISOString()
    };
    
    // Save invitation to Firestore
    const invitationRef = doc(db, 'invitations', invitationId);
    await setDoc(invitationRef, invitation);
    
    // Send email via backend API
    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          office_id: officeId,
          room_id: roomId,
          inviter_name: inviterName,
          inviter_email: inviterEmail,
          invitee_email: inviteeEmail,
          message,
          invitation_link: invitationLink
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      console.log('✅ Email invitation sent successfully');
    } catch (emailError) {
      console.warn('❌ Failed to send email, but invitation created:', emailError);
      // Even if email fails, we still have the invitation link
    }
    
    return {
      success: true,
      invitationId,
      invitationLink,
      message: 'Invitation created successfully'
    };
    
  } catch (error) {
    console.error('Error sending email invitation:', error);
    throw error;
  }
};

export const getInvitation = async (invitationId: string): Promise<EmailInvitation | null> => {
  try {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (invitationSnap.exists()) {
      return invitationSnap.data() as EmailInvitation;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting invitation:', error);
    return null;
  }
};

export const acceptInvitation = async (invitationId: string) => {
  try {
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

// Join Request Management
export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string;
  officeId: string;
  officeName: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  updatedAt: string;
}

export const createJoinRequest = async (request: Omit<JoinRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'joinRequests'), {
      ...request,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating join request:', error);
    throw error;
  }
};

export const subscribeToJoinRequests = (ownerId: string, callback: (requests: JoinRequest[]) => void) => {
  const q = query(
    collection(db, 'joinRequests'),
    where('ownerId', '==', ownerId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests: JoinRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as JoinRequest);
    });
    callback(requests);
  }, (error) => {
    console.error('Error subscribing to join requests:', error);
    callback([]);
  });
};

export const updateJoinRequestStatus = async (requestId: string, status: 'approved' | 'denied') => {
  try {
    const requestRef = doc(db, 'joinRequests', requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating join request:', error);
    throw error;
  }
};

export const deleteJoinRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'joinRequests', requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting join request:', error);
    throw error;
  }
}; 