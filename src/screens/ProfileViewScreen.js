import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileViewScreen = ({ route, navigation }) => {
  const { user: viewedUser } = route.params;
  const { user } = useAuth();
  const [hoveredSection, setHoveredSection] = useState(null);

  // Create or get chat function (inline to avoid import issues)
  const getOrCreateChat = async (currentUserId, otherUserId) => {
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

  const startChat = async () => {
    try {
      // Get or create chat
      const chatId = await getOrCreateChat(user.uid, viewedUser.userId);
      
      // Navigate to ChatScreen with proper parameters
      navigation.navigate('Chat', {
        chatId: chatId,
        otherUser: {
          name: viewedUser.name,
          email: viewedUser.email,
          userId: viewedUser.userId,
        },
        otherUserId: viewedUser.userId,
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const getUserTypeLabel = () => {
    return viewedUser.userType === 'student' ? 'Student' : 'Organization';
  };

  const getInstitutionLabel = () => {
    return viewedUser.userType === 'student' ? 'College' : 'Organization';
  };

  const getInstitutionName = () => {
    return viewedUser.userType === 'student' ? viewedUser.collegeName : viewedUser.organizationName;
  };

  const HoverableSection = ({ children, sectionKey, style }) => {
    return (
      <Pressable
        style={[
          styles.section,
          style,
          hoveredSection === sectionKey && styles.sectionHovered
        ]}
        onPressIn={() => setHoveredSection(sectionKey)}
        onPressOut={() => setHoveredSection(null)}
        onHoverIn={() => setHoveredSection(sectionKey)}
        onHoverOut={() => setHoveredSection(null)}
      >
        {children}
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.name}>{viewedUser.name}</Text>
          <Text style={styles.email}>{viewedUser.email}</Text>
          <View style={styles.userTypeContainer}>
            <Text style={styles.userType}>{getUserTypeLabel()}</Text>
            {viewedUser.location && (
              <Text style={styles.location}>📍 {viewedUser.location}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.chatButton} onPress={startChat}>
          <Icon name="chat" size={20} color="white" />
          <Text style={styles.chatButtonText}>Start Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Basic Information Section */}
      <HoverableSection sectionKey="basicInfo">
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* User Type */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>User Type:</Text>
          <Text style={styles.infoValue}>{getUserTypeLabel()}</Text>
        </View>

        {/* College/Organization Name */}
        {getInstitutionName() && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{getInstitutionLabel()}:</Text>
            <Text style={styles.infoValue}>{getInstitutionName()}</Text>
          </View>
        )}

        {/* Location */}
        {viewedUser.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{viewedUser.location}</Text>
          </View>
        )}
      </HoverableSection>
      
      {/* About Section */}
      <HoverableSection sectionKey="about">
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{viewedUser.bio || 'No bio available'}</Text>
      </HoverableSection>
      
      {/* Can Teach Section */}
      <HoverableSection sectionKey="canTeach">
        <Text style={styles.sectionTitle}>Can Teach</Text>
        <View style={styles.skillsContainer}>
          {viewedUser.canTeach && viewedUser.canTeach.length > 0 ? (
            viewedUser.canTeach.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noSkillsText}>No teaching skills listed</Text>
          )}
        </View>
      </HoverableSection>
      
      {/* Wants to Learn Section */}
      <HoverableSection sectionKey="wantToLearn">
        <Text style={styles.sectionTitle}>Wants to Learn</Text>
        <View style={styles.skillsContainer}>
          {viewedUser.wantToLearn && viewedUser.wantToLearn.length > 0 ? (
            viewedUser.wantToLearn.map((skill, index) => (
              <View key={index} style={[styles.skillTag, styles.wantToLearnTag]}>
                <Text style={[styles.skillText, styles.wantToLearnText]}>{skill}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noSkillsText}>No learning goals listed</Text>
          )}
        </View>
      </HoverableSection>
    </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D48',
  },
  headerContent: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  email: {
    fontSize: 16,
    color: '#8B8B8B',
    marginTop: 4,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  userType: {
    fontSize: 14,
    color: '#8B5CF6',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  location: {
    fontSize: 14,
    color: '#8B8B8B',
    marginBottom: 4,
  },
  chatButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#1A1A2E',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D48',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    transition: 'all 0.2s ease',
  },
  sectionHovered: {
    backgroundColor: '#252545',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ translateY: -2 }],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#8B8B8B',
    flex: 1,
  },
  bio: {
    fontSize: 16,
    color: '#8B8B8B',
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#0F0F23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  skillText: {
    fontSize: 14,
    color: '#8B5CF6',
  },
  wantToLearnTag: {
    backgroundColor: '#0F0F23',
    borderColor: '#2D2D48',
  },
  wantToLearnText: {
    color: '#EF4444',
  },
  noSkillsText: {
    fontSize: 14,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
});

export default ProfileViewScreen;