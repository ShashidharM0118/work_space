import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setDoc, getDoc, getDocs, limit, Timestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB39qm8EN6MJQqIhKpLUSRLNKDhhTCE8aA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "typio-57fa9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "typio-57fa9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "typio-57fa9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "172519754508",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:172519754508:web:898f3afc8a28b21094d729",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-FZRJ65M4FK"
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

// Email/Password Authentication
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Successfully signed in with email:', result.user.email);
    
    // Create or update user profile
    await createOrUpdateUserProfile(result.user);
    
    return result;
  } catch (error: any) {
    console.error('❌ Email Sign In Error:', {
      code: error.code,
      message: error.message
    });
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    await updateProfile(result.user, {
      displayName: displayName
    });
    
    console.log('✅ Successfully created account with email:', result.user.email);
    
    // Create or update user profile with the display name
    await createOrUpdateUserProfile({
      ...result.user,
      displayName: displayName
    });
    
    return result;
  } catch (error: any) {
    console.error('❌ Email Sign Up Error:', {
      code: error.code,
      message: error.message
    });
    throw error;
  }
};

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

// Add this interface near the top, after other interfaces
interface UserProfileData {
  userId: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

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

export const getMemberOffices = async (userId: string): Promise<string[]> => {
  try {
    const userOfficesRef = doc(db, 'userOffices', userId);
    const userOfficesSnap = await getDoc(userOfficesRef);
    
    if (userOfficesSnap.exists()) {
      const data = userOfficesSnap.data();
      return data.memberOffices || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting member offices:', error);
    return [];
  }
};

// Activity Tracking System
export interface UserActivity {
  userId: string;
  officeId: string;
  roomId: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  date: string; // YYYY-MM-DD format
  isActive: boolean;
}

export interface ActivityStats {
  totalEmployees: number;
  activeNow: number;
  avgWeeklyHours: number;
  topPerformers: {
    userId: string;
    name: string;
    email: string;
    avatar: string;
    weeklyHours: number;
    department: string;
  }[];
}

// Start tracking user activity when they join a room
export const startActivityTracking = async (
  userId: string, 
  officeId: string, 
  roomId: string,
  userName: string
): Promise<string> => {
  try {
    const sessionId = `${userId}_${Date.now()}`;
    const now = new Date();
    const activity: UserActivity = {
      userId,
      officeId,
      roomId,
      sessionId,
      startTime: now.toISOString(),
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      isActive: true
    };

    // Store in userActivity collection
    await setDoc(doc(db, 'userActivity', sessionId), activity);

    // Update user's current activity status
    const userStatusRef = doc(db, 'userStatus', userId);
    await setDoc(userStatusRef, {
      userId,
      isActive: true,
      currentOfficeId: officeId,
      currentRoomId: roomId,
      currentSessionId: sessionId,
      lastActiveAt: now.toISOString(),
      userName
    });

    console.log('✅ Activity tracking started for session:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('Error starting activity tracking:', error);
    throw error;
  }
};

// Stop tracking user activity when they leave a room
export const stopActivityTracking = async (sessionId: string): Promise<number> => {
  try {
    const activityRef = doc(db, 'userActivity', sessionId);
    const activitySnap = await getDoc(activityRef);
    
    if (!activitySnap.exists()) {
      console.warn('Activity session not found:', sessionId);
      return 0;
    }

    const activity = activitySnap.data() as UserActivity;
    const endTime = new Date();
    const startTime = new Date(activity.startTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

    // Update activity record with end time and duration
    await updateDoc(activityRef, {
      endTime: endTime.toISOString(),
      duration,
      isActive: false
    });

    // Update user status to inactive
    const userStatusRef = doc(db, 'userStatus', activity.userId);
    await updateDoc(userStatusRef, {
      isActive: false,
      lastActiveAt: endTime.toISOString(),
      currentOfficeId: null,
      currentRoomId: null,
      currentSessionId: null
    });

    console.log('✅ Activity tracking stopped. Duration:', duration, 'minutes');
    return duration;
  } catch (error) {
    console.error('Error stopping activity tracking:', error);
    return 0;
  }
};

// Get office activity statistics
export const getOfficeActivityStats = async (officeId: string): Promise<ActivityStats> => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoString = oneWeekAgo.toISOString().split('T')[0];

    // Get all users who have been active in this office in the past week
    const activityQuery = query(
      collection(db, 'userActivity'),
      where('officeId', '==', officeId),
      where('date', '>=', weekAgoString)
    );
    
    const activitySnap = await getDocs(activityQuery);
    const activities = activitySnap.docs.map(doc => doc.data() as UserActivity);

    // Get currently active users
    const statusQuery = query(
      collection(db, 'userStatus'),
      where('currentOfficeId', '==', officeId),
      where('isActive', '==', true)
    );
    
    const statusSnap = await getDocs(statusQuery);
    const activeNow = statusSnap.docs.length;

    // Calculate user stats
    const userStats = new Map<string, {
      userId: string;
      totalMinutes: number;
      name: string;
      email: string;
      avatar: string;
    }>();

    for (const activity of activities) {
      if (activity.duration) {
        const existing = userStats.get(activity.userId) || {
          userId: activity.userId,
          totalMinutes: 0,
          name: '',
          email: '',
          avatar: ''
        };
        existing.totalMinutes += activity.duration;
        userStats.set(activity.userId, existing);
      }
    }

    // Get user profile data for stats
    const userIds = Array.from(userStats.keys());
    const userProfiles = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          return userDoc.exists() ? { userId, ...(userDoc.data() as Partial<UserProfileData>) } : null;
        } catch {
          return null;
        }
      })
    );

    // Merge user data with stats
    userProfiles.forEach(profile => {
      if (profile) {
        const stats = userStats.get(profile.userId);
        if (stats) {
          stats.name = profile.displayName || profile.email || 'Unknown User';
          stats.email = profile.email || '';
          stats.avatar = profile.photoURL || '';
        }
      }
    });

    // Calculate top performers
    const topPerformers = Array.from(userStats.values())
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5)
      .map(user => ({
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        weeklyHours: Math.round((user.totalMinutes / 60) * 10) / 10,
        department: 'Team Member' // Could be enhanced with user departments
      }));

    // Calculate average weekly hours
    const totalUsers = userStats.size;
    const totalHours = Array.from(userStats.values()).reduce((sum, user) => sum + user.totalMinutes, 0) / 60;
    const avgWeeklyHours = totalUsers > 0 ? Math.round((totalHours / totalUsers) * 10) / 10 : 0;

    return {
      totalEmployees: totalUsers,
      activeNow,
      avgWeeklyHours,
      topPerformers
    };
  } catch (error) {
    console.error('Error getting office activity stats:', error);
    return {
      totalEmployees: 0,
      activeNow: 0,
      avgWeeklyHours: 0,
      topPerformers: []
    };
  }
};

// Update user activity heartbeat (call periodically while user is active)
export const updateActivityHeartbeat = async (sessionId: string): Promise<void> => {
  try {
    const activityRef = doc(db, 'userActivity', sessionId);
    const activitySnap = await getDoc(activityRef);
    
    if (activitySnap.exists()) {
      const activity = activitySnap.data() as UserActivity;
      
      // Update user status heartbeat
      const userStatusRef = doc(db, 'userStatus', activity.userId);
      await updateDoc(userStatusRef, {
        lastActiveAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating activity heartbeat:', error);
  }
};

// Get user role in an office
export const getUserRoleInOffice = async (userId: string, officeId: string): Promise<'owner' | 'member' | null> => {
  try {
    // Check if user is the office owner
    const officeRef = doc(db, 'offices', officeId);
    const officeSnap = await getDoc(officeRef);
    
    if (officeSnap.exists()) {
      const officeData = officeSnap.data();
      if (officeData.ownerId === userId) {
        return 'owner';
      }
    }

    // Check if user is a member through userOffices collection
    const userOfficesRef = doc(db, 'userOffices', userId);
    const userOfficesSnap = await getDoc(userOfficesRef);
    
    if (userOfficesSnap.exists()) {
      const userOfficesData = userOfficesSnap.data();
      if (userOfficesData.memberOffices && userOfficesData.memberOffices.includes(officeId)) {
        return 'member';
      }
      if (userOfficesData.ownedOffices && userOfficesData.ownedOffices.includes(officeId)) {
        return 'owner';
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user role in office:', error);
    return null;
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

// Office Invitation System
export interface OfficeInvitation {
  officeId: string;
  officeName: string;
  inviterUid: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeUid?: string;
  message?: string;
  createdAt: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt?: string;
}

export const sendOfficeInvitation = async (invitation: OfficeInvitation) => {
  try {
    // Check if invitee exists in users collection
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', invitation.inviteeEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User with this email is not registered. Please ask them to sign up at the website first, then try sending the invitation again.');
    }
    
    const inviteeUser = userSnapshot.docs[0];
    const inviteeUid = inviteeUser.id;
    
    // Check for existing pending invitation
    const invitationsRef = collection(db, 'officeInvitations');
    const existingQuery = query(
      invitationsRef,
      where('officeId', '==', invitation.officeId),
      where('inviteeEmail', '==', invitation.inviteeEmail),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('A pending invitation already exists for this user.');
    }
    
    // Create invitation document
    const invitationData = {
      ...invitation,
      inviteeUid,
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    const invitationRef = await addDoc(invitationsRef, invitationData);
    
    // Add to invitee's notifications
    const notificationData = {
      type: 'office_invitation',
      title: `Office Invitation: ${invitation.officeName}`,
      message: `${invitation.inviterName} invited you to join their office`,
      data: {
        invitationId: invitationRef.id,
        officeId: invitation.officeId,
        officeName: invitation.officeName,
        inviterName: invitation.inviterName
      },
      userId: inviteeUid,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
    console.log('Office invitation sent:', invitationRef.id);
    return invitationRef.id;
  } catch (error) {
    console.error('Error sending office invitation:', error);
    throw error;
  }
};

export const getUserInvitations = async (userUid: string) => {
  try {
    // Get user's email
    const userDoc = await getDoc(doc(db, 'users', userUid));
    const userEmail = userDoc.exists() ? userDoc.data().email : null;
    
    const invitationsRef = collection(db, 'officeInvitations');
    
    // Query by both UID and email to catch all invitations
    const queries = [
      query(invitationsRef, where('inviteeUid', '==', userUid), where('status', '==', 'pending'))
    ];
    
    if (userEmail) {
      queries.push(
        query(invitationsRef, where('inviteeEmail', '==', userEmail), where('status', '==', 'pending'))
      );
    }
    
    const allInvitations = [];
    for (const q of queries) {
      const snapshot = await getDocs(q);
      const invitations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      allInvitations.push(...invitations);
    }
    
    // Remove duplicates
    const uniqueInvitations = allInvitations.filter((invitation, index, arr) => 
      arr.findIndex(inv => inv.id === invitation.id) === index
    ) as (OfficeInvitation & { id: string })[];
    
    return uniqueInvitations;
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return []; // Return empty array instead of throwing
  }
};

export const getSentInvitations = async (userUid: string) => {
  try {
    const invitationsRef = collection(db, 'officeInvitations');
    const sentQuery = query(
      invitationsRef,
      where('inviterUid', '==', userUid)
    );
    
    const snapshot = await getDocs(sentQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (OfficeInvitation & { id: string })[];
  } catch (error) {
    console.error('Error fetching sent invitations:', error);
    return [];
  }
};

export const cancelInvitation = async (invitationId: string) => {
  try {
    const invitationRef = doc(db, 'officeInvitations', invitationId);
    await updateDoc(invitationRef, {
      status: 'cancelled'
    });
    console.log('Invitation cancelled:', invitationId);
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
};

export const respondToOfficeInvitation = async (
  invitationId: string,
  response: 'accepted' | 'rejected',
  userUid: string
) => {
  try {
    const invitationRef = doc(db, 'officeInvitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (!invitationSnap.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = invitationSnap.data() as OfficeInvitation;
    
    if (invitation.inviteeUid !== userUid) {
      throw new Error('Unauthorized to respond to this invitation');
    }
    
    // Update invitation status
    await updateDoc(invitationRef, {
      status: response,
      respondedAt: new Date().toISOString()
    });
    
    if (response === 'accepted') {
      // Grant office access - add user to office members
      const userOfficesRef = doc(db, 'userOffices', userUid);
      const userOfficesSnap = await getDoc(userOfficesRef);
      
      if (userOfficesSnap.exists()) {
        const userOffices = userOfficesSnap.data();
        const memberOffices = userOffices.memberOffices || [];
        
        if (!memberOffices.includes(invitation.officeId)) {
          await updateDoc(userOfficesRef, {
            memberOffices: [...memberOffices, invitation.officeId],
            lastUpdatedAt: new Date().toISOString()
          });
        }
      } else {
        await setDoc(userOfficesRef, {
          userId: userUid,
          memberOffices: [invitation.officeId],
          ownedOffices: [],
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        });
      }
      
      // Add success notification
      await addDoc(collection(db, 'notifications'), {
        type: 'office_access_granted',
        title: 'Office Access Granted',
        message: `You now have access to ${invitation.officeName}`,
        data: {
          officeId: invitation.officeId,
          officeName: invitation.officeName
        },
        userId: userUid,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
    
    console.log(`Invitation ${response}:`, invitationId);
    return true;
  } catch (error) {
    console.error('Error responding to invitation:', error);
    throw error;
  }
};

export const getUserNotifications = async (userUid: string) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const userQuery = query(
      notificationsRef,
      where('userId', '==', userUid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(userQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}; 