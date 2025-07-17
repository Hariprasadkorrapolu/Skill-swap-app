import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Creates a new chat between two users
 * @param {string} currentUserId - Current user's ID
 * @param {string} otherUserId - Other user's ID
 * @returns {string} - Chat ID
 */
export const createChat = async (currentUserId, otherUserId) => {
  // Create consistent chat ID regardless of who initiates
  const chatId = [currentUserId, otherUserId].sort().join('_');
  
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    // Check if chat already exists
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      // Create new chat
      await setDoc(chatRef, {
        participants: [currentUserId, otherUserId],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
      });
    }
    
    return chatId;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

/**
 * Gets or creates a chat between two users
 * @param {string} currentUserId - Current user's ID
 * @param {string} otherUserId - Other user's ID
 * @returns {string} - Chat ID
 */
export const getOrCreateChat = async (currentUserId, otherUserId) => {
  try {
    return await createChat(currentUserId, otherUserId);
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    throw error;
  }
};

/**
 * Formats timestamp for display
 * @param {any} timestamp - Firestore timestamp
 * @returns {string} - Formatted time string
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate?.() || new Date(timestamp);
  const now = new Date();
  
  // If message is from today, show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // If message is from this week
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // For older messages, show date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/**
 * Generates a consistent chat ID for two users
 * @param {string} userId1 - First user's ID
 * @param {string} userId2 - Second user's ID
 * @returns {string} - Chat ID
 */
export const generateChatId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};