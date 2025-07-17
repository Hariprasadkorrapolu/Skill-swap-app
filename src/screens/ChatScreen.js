import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Dimensions,
  Modal,
  Linking,
  ScrollView,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';


// Simple AI service replacement (you can replace this with your actual AI service)
const geminiService = {
  isAIMessage: (message) => {
    // Check if message starts with AI trigger words
    const aiTriggers = ['@ai', '/ai', 'ai:', 'hey ai', 'ask ai'];
    return aiTriggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    );
  },
  
  getAIResponse: async (chatId, userMessage, senderName) => {
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple AI responses (replace with your actual AI service)
      const responses = [
        "I'm here to help! How can I assist you today?",
        "That's an interesting question. Let me think about that...",
        "I understand. Could you provide more details?",
        "Based on what you've shared, I'd suggest...",
        "That's a great point! Have you considered...",
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        success: true,
        message: randomResponse
      };
    } catch (error) {
      console.error('AI service error:', error);
      return {
        success: false,
        message: "I'm sorry, I'm having trouble responding right now. Please try again later."
      };
    }
  }
};

const ChatScreen = ({ route, navigation }) => {
  const { chatId, otherUser, otherUserId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const currentUser = auth.currentUser;
  const [isAITyping, setIsAITyping] = useState(false);

  // Check block status
  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    const checkBlockStatus = async () => {
      try {
        // Check if current user blocked the other user
        const blockedByMeRef = doc(db, 'users', currentUser.uid, 'blockedUsers', otherUserId);
        const blockedByMeDoc = await getDoc(blockedByMeRef);
        setIsBlocked(blockedByMeDoc.exists());

        // Check if current user is blocked by the other user
        const blockedByOtherRef = doc(db, 'users', otherUserId, 'blockedUsers', currentUser.uid);
        const blockedByOtherDoc = await getDoc(blockedByOtherRef);
        setIsBlockedBy(blockedByOtherDoc.exists());
      } catch (error) {
        console.error('Error checking block status:', error);
      }
    };

    checkBlockStatus();

    // Real-time listener for block status changes
    const unsubscribeBlockedByMe = onSnapshot(
      doc(db, 'users', currentUser.uid, 'blockedUsers', otherUserId),
      (doc) => {
        setIsBlocked(doc.exists());
      }
    );

    const unsubscribeBlockedByOther = onSnapshot(
      doc(db, 'users', otherUserId, 'blockedUsers', currentUser.uid),
      (doc) => {
        setIsBlockedBy(doc.exists());
      }
    );

    return () => {
      unsubscribeBlockedByMe();
      unsubscribeBlockedByOther();
    };
  }, [currentUser, otherUserId]);

  // Block/Unblock functionality
  const toggleBlockUser = async () => {
    if (!currentUser || !otherUserId) return;

    setBlockLoading(true);
    
    try {
      const blockedUserRef = doc(db, 'users', currentUser.uid, 'blockedUsers', otherUserId);
      
      if (isBlocked) {
        // Unblock user
        await deleteDoc(blockedUserRef);
        Alert.alert('Success', 'User has been unblocked');
      } else {
        // Block user
        await setDoc(blockedUserRef, {
          blockedAt: serverTimestamp(),
          blockedUserId: otherUserId,
          blockedUserName: otherUser?.name || otherUser?.email || 'Unknown',
        });
        Alert.alert('Success', 'User has been blocked');
      }
      
      setShowOptionsModal(false);
    } catch (error) {
      console.error('Error toggling block status:', error);
      Alert.alert('Error', 'Failed to update block status. Please try again.');
    } finally {
      setBlockLoading(false);
    }
  };

  // Enhanced keyboard handling for all platforms
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip keyboard listeners on web
    
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (!chatId) return;

    // Listen to messages in this chat
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Filter out messages from blocked users or if user is blocked
      const filteredMessageList = messageList.filter(message => {
        // Always show current user's messages
        if (message.senderId === currentUser.uid) return true;
        
        // Always show AI messages
        if (message.senderId === 'ai-assistant') return true;
        
        // Hide messages from blocked users
        if (isBlocked && message.senderId === otherUserId) return false;
        
        // Hide messages if blocked by other user (optional - you can keep these visible)
        // if (isBlockedBy && message.senderId === otherUserId) return false;
        
        return true;
      });
      
      setMessages(filteredMessageList);
      setFilteredMessages(filteredMessageList); // Initialize filtered messages
    });

    return unsubscribe;
  }, [chatId, isBlocked, isBlockedBy, currentUser, otherUserId]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }

    const filtered = messages.filter(message =>
      message.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.senderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [searchQuery, messages]);

  const createChatIfNotExists = async () => {
    if (chatId) return chatId;

    // Create a consistent chat ID (sorted user IDs joined with underscore)
    const newChatId = [currentUser.uid, otherUserId].sort().join('_');
    const chatRef = doc(db, 'chats', newChatId);

    try {
      // Check if chat already exists
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, otherUserId],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
        });
      }
      
      return newChatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || loading || isComposing) return;

    // Check if user is blocked or blocking
    if (isBlocked) {
      Alert.alert('Cannot Send Message', 'You have blocked this user. Unblock them to send messages.');
      return;
    }

    if (isBlockedBy) {
      Alert.alert('Cannot Send Message', 'You have been blocked by this user and cannot send messages.');
      return;
    }

    setLoading(true);
    const userMessage = inputText.trim();
    
    try {
      let activeChatId = chatId;
      
      // Create chat if it doesn't exist
      if (!activeChatId) {
        activeChatId = await createChatIfNotExists();
      }

      // Add user message to Firestore
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        text: userMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
      });

      // Update chat document with last message info
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: userMessage,
        lastMessageTime: serverTimestamp(),
      });

      setInputText('');
      
      // Check if AI should respond
      if (geminiService.isAIMessage(userMessage)) {
        setIsAITyping(true);
        
        // Get AI response
        const aiResponse = await geminiService.getAIResponse(
          activeChatId,
          userMessage,
          currentUser.displayName || currentUser.email
        );
        
        if (aiResponse && aiResponse.success) {
          // Add AI response to Firestore
          await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
            text: aiResponse.message,
            senderId: 'ai-assistant',
            senderName: 'AI Assistant',
            timestamp: serverTimestamp(),
            messageType: 'ai',
          });

          // Update chat document
          await updateDoc(doc(db, 'chats', activeChatId), {
            lastMessage: `AI: ${aiResponse.message.substring(0, 50)}...`,
            lastMessageTime: serverTimestamp(),
          });
        }
        
        setIsAITyping(false);
      }
      
      // Improved scroll to bottom after sending message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setIsAITyping(false);
    } finally {
      setLoading(false);
    }
  }, [inputText, loading, isComposing, chatId, currentUser, otherUserId, isBlocked, isBlockedBy]);

  // Generate Google Meet link
  const generateMeetLink = () => {
    const baseUrl = 'https://meet.google.com/new';
    return baseUrl;
  };

  // Send meeting invitation
  const sendMeetingInvitation = async () => {
    if (!meetingTitle.trim() || !meetingDate.trim() || !meetingTime.trim()) {
      Alert.alert('Error', 'Please fill in all meeting details');
      return;
    }

    // Check if user is blocked or blocking
    if (isBlocked) {
      Alert.alert('Cannot Send Meeting', 'You have blocked this user. Unblock them to send meeting invitations.');
      return;
    }

    if (isBlockedBy) {
      Alert.alert('Cannot Send Meeting', 'You have been blocked by this user and cannot send meeting invitations.');
      return;
    }

    const meetLink = generateMeetLink();
    const meetingMessage = `📅 Meeting Invitation\n\nTitle: ${meetingTitle}\nDate: ${meetingDate}\nTime: ${meetingTime}\n\nJoin the meeting: ${meetLink}`;

    setLoading(true);
    try {
      let activeChatId = chatId;
      
      if (!activeChatId) {
        activeChatId = await createChatIfNotExists();
      }

      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        text: meetingMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        messageType: 'meeting',
      });

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: `Meeting invitation: ${meetingTitle}`,
        lastMessageTime: serverTimestamp(),
      });

      setShowMeetingModal(false);
      setMeetingTitle('');
      setMeetingDate('');
      setMeetingTime('');
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
      
    } catch (error) {
      console.error('Error sending meeting invitation:', error);
      Alert.alert('Error', 'Failed to send meeting invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced key handling for PC/laptop
  const handleKeyPress = useCallback((e) => {
    if (Platform.OS === 'web') {
      // Handle Enter key on web/desktop
      if (e.nativeEvent.key === 'Enter') {
        if (e.nativeEvent.shiftKey) {
          // Shift+Enter for new line - let default behavior handle this
          return;
        } else {
          // Enter alone sends message
          e.preventDefault();
          sendMessage();
        }
      }
      // Handle Escape key to blur input
      else if (e.nativeEvent.key === 'Escape') {
        textInputRef.current?.blur();
      }
    }
  }, [sendMessage]);

  // Handle text input changes with better cross-platform support
  const handleTextChange = useCallback((text) => {
    setInputText(text);
  }, []);

  // Handle composition events for better IME support
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // Handle submit editing for mobile
  const handleSubmitEditing = useCallback((e) => {
    if (Platform.OS !== 'web' && !isComposing) {
      sendMessage();
    }
  }, [sendMessage, isComposing]);

  // Focus management
  const focusInput = useCallback(() => {
    textInputRef.current?.focus();
  }, []);

  // Search bar toggle
  const toggleSearchBar = useCallback(() => {
    setShowSearchBar(!showSearchBar);
    if (!showSearchBar) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [showSearchBar]);

  // Open meeting link
  const openMeetingLink = useCallback((meetLink) => {
    if (Platform.OS === 'web') {
      window.open(meetLink, '_blank');
    } else {
      Linking.openURL(meetLink);
    }
  }, []);

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUser.uid;
    const isAIMessage = item.senderId === 'ai-assistant' || item.messageType === 'ai';
    const messageTime = item.timestamp?.toDate?.()?.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }) || '';

    // Check if message contains meeting link
    const isMeetingMessage = item.messageType === 'meeting' || item.text.includes('meet.google.com');
    const meetLink = item.text.match(/https:\/\/meet\.google\.com\/[^\s]+/);

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          isMeetingMessage && styles.meetingMessage,
          isAIMessage && styles.aiMessage,
        ]}
      >
        {isAIMessage && (
          <Text style={styles.aiMessageLabel}>🤖 AI Assistant</Text>
        )}
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
          isMeetingMessage && styles.meetingMessageText,
          isAIMessage && styles.aiMessageText,
        ]}>
          {item.text}
        </Text>
        {meetLink && (
          <TouchableOpacity
            style={styles.meetLinkButton}
            onPress={() => openMeetingLink(meetLink[0])}
          >
            <Text style={styles.meetLinkButtonText}>Join Meeting</Text>
          </TouchableOpacity>
        )}
        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.currentUserTimeText : styles.otherUserTimeText,
          isAIMessage && styles.aiTimeText,
        ]}>
          {messageTime}
        </Text>
      </View>
    );
  };

  const displayName = otherUser?.name || otherUser?.email || 'Chat';
  const blockStatusText = isBlocked ? 'User is blocked' : isBlockedBy ? 'You are blocked' : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{displayName}</Text>
          {blockStatusText && (
            <Text style={styles.blockStatusText}>{blockStatusText}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={toggleSearchBar}
          >
            <Text style={styles.actionButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowMeetingModal(true)}
            disabled={isBlocked || isBlockedBy}
          >
            <Text style={[
              styles.actionButtonText,
              (isBlocked || isBlockedBy) && styles.actionButtonTextDisabled
            ]}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowOptionsModal(true)}
          >
            <Text style={styles.actionButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearchBar && (
        <View style={styles.searchBarContainer}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search messages..."
            placeholderTextColor="#999"
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchCloseButton}
            onPress={toggleSearchBar}
          >
            <Text style={styles.searchCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={showSearchBar ? filteredMessages : messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={[
          styles.messagesList,
          // Adjust list height when keyboard is open
          Platform.OS === 'android' && keyboardHeight > 0 && {
            marginBottom: 72, // Height of input container
          }
        ]}
        contentContainerStyle={[
          styles.messagesContainer,
          // Dynamic padding based on keyboard state
          keyboardHeight > 0 ? {
            paddingBottom: 100, // Extra padding when keyboard is open
          } : {
            paddingBottom: 92, // Default padding for input bar
          }
        ]}
        onContentSizeChange={() => {
          // Delay scroll to ensure proper layout
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        }}
        onLayout={() => {
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
        ListEmptyComponent={
          <TouchableOpacity
            style={styles.emptyContainer}
            onPress={focusInput}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyText}>
              {showSearchBar ? 'No messages found' : 'No messages yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {showSearchBar ? 'Try a different search term' : 'Tap here or below to start the conversation!'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* AI Typing Indicator */}
      {isAITyping && (
        <View style={styles.aiTypingContainer}>
          <Text style={styles.aiTypingText}>🤖 AI is typing...</Text>
        </View>
      )}

      {/* Block Warning */}
      {(isBlocked || isBlockedBy) && (
        <View style={styles.blockWarningContainer}>
          <Text style={styles.blockWarningText}>
            {isBlocked 
              ? 'You have blocked this user. Unblock to send messages.' 
              : 'You have been blocked by this user and cannot send messages.'}
          </Text>
        </View>
      )}

      <View 
        style={[
          styles.inputContainer,
          Platform.OS === 'web' && styles.inputContainerWeb,
          (isBlocked || isBlockedBy) && styles.inputContainerDisabled,
          // Better keyboard positioning for mobile
          Platform.OS === 'android' && keyboardHeight > 0 && {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }
        ]}
      >
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            Platform.OS === 'web' && styles.textInputWeb,
            inputText.length > 100 && styles.textInputExpanded,
            (isBlocked || isBlockedBy) && styles.textInputDisabled
          ]}
          value={inputText}
          onChangeText={handleTextChange}
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleSubmitEditing}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={
            isBlocked || isBlockedBy 
              ? "Cannot send messages" 
              : Platform.OS === 'web' 
                ? "Type a message... (Enter to send, Shift+Enter for new line)" 
                : "Type a message..."
          }
          placeholderTextColor="#999"
          multiline
          numberOfLines={Platform.OS === 'web' ? undefined : 4}
          maxLength={1000}
          returnKeyType={Platform.OS === 'web' ? 'default' : 'send'}
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          autoFocus={false}
          selectTextOnFocus={false}
          editable={!isBlocked && !isBlockedBy}
          // Enhanced accessibility
          accessibilityLabel="Message input"
          accessibilityHint="Type your message here"
          // Web-specific props
          {...(Platform.OS === 'web' && {
            onKeyDown: handleKeyPress,
            style: [
              styles.textInput,
              styles.textInputWeb,
              inputText.length > 100 && styles.textInputExpanded,
              (isBlocked || isBlockedBy) && styles.textInputDisabled,
              {
                outline: 'none',
                resize: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }
            ]
          })}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (loading || !inputText.trim() || isComposing || isBlocked || isBlockedBy) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={loading || !inputText.trim() || isComposing || isBlocked || isBlockedBy}
          accessibilityLabel="Send message"
          accessibilityHint="Send your message"
        >
          <Text style={[
            styles.sendButtonText,
            (loading || !inputText.trim() || isComposing || isBlocked || isBlockedBy) && styles.sendButtonTextDisabled
          ]}>
            {loading ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModalContent}>
            <Text style={styles.modalTitle}>User Options</Text>
            
            <TouchableOpacity
              style={[styles.optionButton, isBlocked && styles.unblockButton]}
              onPress={toggleBlockUser}
              disabled={blockLoading}
            >
              <Text style={[
                styles.optionButtonText,
                isBlocked && styles.unblockButtonText
              ]}>
                {blockLoading 
                  ? (isBlocked ? 'Unblocking...' : 'Blocking...') 
                  : (isBlocked ? '✓ Unblock User' : '🚫 Block User')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionCancelButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.optionCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meeting Modal */}
      <Modal
        visible={showMeetingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMeetingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Meeting</Text>
            
            <TextInput
              style={styles.modalInput}
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              placeholder="Meeting Title"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.modalInput}
              value={meetingDate}
              onChangeText={setMeetingDate}
              placeholder="Date (e.g., Dec 25, 2024)"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.modalInput}
              value={meetingTime}
              onChangeText={setMeetingTime}
              placeholder="Time (e.g., 2:00 PM)"
              placeholderTextColor="#999"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowMeetingModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSendButton}
                onPress={sendMeetingInvitation}
                disabled={loading}
              >
                <Text style={styles.modalSendButtonText}>
                  {loading ? 'Sending...' : 'Send Invitation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23', // Dark background
    position: 'relative',
    ...Platform.select({
      web: {
        maxHeight: '100vh',
        overflow: 'hidden',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'web' ? 16 : 20,
    paddingBottom: 16,
    backgroundColor: '#1A1A2E', // Dark header
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D48',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2D2D48',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  backButtonText: {
    fontSize: 24,
    color: '#8B5CF6', // Purple accent
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  blockStatusText: {
    fontSize: 12,
    color: '#8B8B8B',
    textAlign: 'center',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2D2D48',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  actionButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  actionButtonTextDisabled: {
    color: '#8B8B8B',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D48',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#0F0F23',
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchCloseButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#2D2D48',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  searchCloseButtonText: {
    fontSize: 16,
    color: '#8B8B8B',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#0F0F23',
    ...Platform.select({
      android: {
        marginBottom: 0,
      },
      ios: {
        marginBottom: 0,
      },
    }),
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 92,
    flexGrow: 1,
    minHeight: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 100,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8B8B',
    textAlign: 'center',
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B5CF6', // Purple for current user
    marginLeft: '20%',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D48',
    marginRight: '20%',
  },
  meetingMessage: {
    backgroundColor: '#1A1A2E',
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  aiMessage: {
    backgroundColor: '#1A1A2E',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    marginRight: '20%',
    alignSelf: 'flex-start',
  },
  aiMessageLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  currentUserMessageText: {
    color: '#FFFFFF',
  },
  otherUserMessageText: {
    color: '#FFFFFF',
  },
  meetingMessageText: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#FFFFFF',
  },
  meetLinkButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  meetLinkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messageTime: {
    fontSize: 12,
    textAlign: 'right',
  },
  currentUserTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTimeText: {
    color: '#8B8B8B',
  },
  aiTimeText: {
    color: '#8B5CF6',
  },
  aiTypingContainer: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '70%',
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  aiTypingText: {
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  blockWarningContainer: {
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  blockWarningText: {
    color: '#8B8B8B',
    textAlign: 'center',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2D2D48',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 72,
    zIndex: 1000,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  inputContainerWeb: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 16,
    backgroundColor: '#0F0F23',
    color: '#FFFFFF',
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  textInputWeb: {
    minHeight: 44,
    maxHeight: 150,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 16,
    lineHeight: 20,
    resize: 'none',
    outline: 'none',
    border: '1px solid #2D2D48',
    borderRadius: 20,
    boxShadow: 'none',
    transition: 'border-color 0.2s ease',
  },
  textInputExpanded: {
    maxHeight: 150,
  },
  textInputDisabled: {
    backgroundColor: '#1A1A2E',
    color: '#8B8B8B',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: '#2D2D48',
    elevation: 0,
    shadowOpacity: 0,
    ...Platform.select({
      web: {
        cursor: 'not-allowed',
      },
    }),
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButtonTextDisabled: {
    color: '#8B8B8B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  optionsModalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#0F0F23',
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#2D2D48',
    marginRight: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#8B8B8B',
    fontWeight: '600',
  },
  modalSendButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    marginLeft: 8,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalSendButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionButton: {
    backgroundColor: '#2D2D48',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  optionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  unblockButton: {
    backgroundColor: '#8B5CF6',
  },
  unblockButtonText: {
    color: '#FFFFFF',
  },
  optionCancelButton: {
    backgroundColor: '#2D2D48',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  optionCancelButtonText: {
    fontSize: 16,
    color: '#8B8B8B',
    fontWeight: '600',
  },
});

export default ChatScreen