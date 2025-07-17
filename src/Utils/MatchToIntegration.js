import { createChat } from './chatUtils';

/**
 * Navigate from match screen to chat
 * Usage: Add this to your SkillMatchScreen where users can start chatting
 */
export const navigateToChat = async (navigation, currentUserId, otherUser) => {
  try {
    // Create or get existing chat
    const chatId = await createChat(currentUserId, otherUser.id);
    
    // Navigate to chat screen
    navigation.navigate('Chat', {
      chatId: chatId,
      otherUser: otherUser,
      otherUserId: otherUser.id,
    });
  } catch (error) {
    console.error('Error navigating to chat:', error);
    // Handle error - maybe show an alert
  }
};

/**
 * Example usage in your SkillMatchScreen:
 * 
 * import { navigateToChat } from '../utils/MatchToChatIntegration';
 * import { auth } from '../config/firebase';
 * 
 * const handleStartChat = async (matchedUser) => {
 *   const currentUser = auth.currentUser;
 *   await navigateToChat(navigation, currentUser.uid, matchedUser);
 * };
 * 
 * // Then in your JSX:
 * <TouchableOpacity onPress={() => handleStartChat(matchedUser)}>
 *   <Text>Start Chat</Text>
 * </TouchableOpacity>
 */