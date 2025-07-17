import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Listen to chats where current user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatList = [];
      const profiles = {};

      for (const docSnap of snapshot.docs) {
        const chatData = docSnap.data();
        const otherUserId = chatData.participants.find(
          (id) => id !== currentUser.uid
        );

        // Get other user's profile
        if (otherUserId && !profiles[otherUserId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              profiles[otherUserId] = userDoc.data();
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }

        chatList.push({
          id: docSnap.id,
          ...chatData,
          otherUserId,
        });
      }

      setChats(chatList);
      setUserProfiles(profiles);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const renderChatItem = ({ item }) => {
    const otherUser = userProfiles[item.otherUserId];
    const displayName = otherUser?.name || otherUser?.email || 'Unknown User';
    const lastMessageText = item.lastMessage || 'No messages yet';
    const lastMessageTime = item.lastMessageTime?.toDate?.()?.toLocaleTimeString() || '';

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', {
            chatId: item.id,
            otherUser: otherUser,
            otherUserId: item.otherUserId,
          })
        }
      >
        <View style={styles.chatItemContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.chatInfo}>
            <Text style={styles.chatName}>{displayName}</Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessageText}
            </Text>
          </View>
          <Text style={styles.timestamp}>{lastMessageTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>
      
      {chats.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation by matching with someone!
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  header: {
    backgroundColor: '#1A1A2E',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D48',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B8B8B',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8B8B',
    textAlign: 'center',
  },
  chatList: {
    paddingVertical: 8,
  },
  chatItem: {
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D48',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8B8B8B',
  },
  timestamp: {
    fontSize: 12,
    color: '#8B8B8B',
    marginLeft: 8,
  },
});

export default ChatListScreen