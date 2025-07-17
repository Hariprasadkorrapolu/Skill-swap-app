import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Updated import
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillModalType, setSkillModalType] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        setProfile(profileData);
        setEditedProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, editedProfile);
      setProfile(editedProfile);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const addSkill = (type) => {
    if (Platform.OS === 'ios') {
      const skillType = type === 'canTeach' ? 'teaching skills' : 'learning goals';
      Alert.prompt(
        'Add Skill',
        `Add new skill to ${skillType}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (skillInput) => {
              if (skillInput && skillInput.trim()) {
                const currentSkills = editedProfile[type] || [];
                setEditedProfile({
                  ...editedProfile,
                  [type]: [...currentSkills, skillInput.trim()],
                });
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // For Android, use custom modal
      setSkillModalType(type);
      setNewSkill('');
      setShowSkillModal(true);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      const currentSkills = editedProfile[skillModalType] || [];
      setEditedProfile({
        ...editedProfile,
        [skillModalType]: [...currentSkills, newSkill.trim()],
      });
      setShowSkillModal(false);
      setNewSkill('');
    }
  };

  const removeSkill = (type, index) => {
    const currentSkills = editedProfile[type] || [];
    const updatedSkills = currentSkills.filter((_, i) => i !== index);
    setEditedProfile({
      ...editedProfile,
      [type]: updatedSkills,
    });
  };

  const getUserTypeLabel = () => {
    return profile?.userType === 'student' ? 'Student' : 'Organization';
  };

  const getInstitutionLabel = () => {
    return profile?.userType === 'student' ? 'College' : 'Organization';
  };

  const getInstitutionName = () => {
    return profile?.userType === 'student' ? profile?.collegeName : profile?.organizationName;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.userTypeContainer}>
              <Text style={styles.userType}>{getUserTypeLabel()}</Text>
              {profile.location && (
                <Text style={styles.location}>📍 {profile.location}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(!editing)}
          >
            <Icon name={editing ? 'close' : 'edit'} size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.name || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
                placeholder="Enter your name"
                placeholderTextColor="#8B8B8B"
              />
            ) : (
              <Text style={styles.inputValue}>{profile.name || 'Not specified'}</Text>
            )}
          </View>

          {/* User Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>User Type</Text>
            {editing ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editedProfile.userType || 'student'}
                  onValueChange={(itemValue) => setEditedProfile({ ...editedProfile, userType: itemValue })}
                  style={styles.picker}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Organization" value="organization" />
                </Picker>
              </View>
            ) : (
              <Text style={styles.inputValue}>{getUserTypeLabel()}</Text>
            )}
          </View>

          {/* College/Organization Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{getInstitutionLabel()} Name</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.userType === 'student' ? 
                  (editedProfile.collegeName || '') : 
                  (editedProfile.organizationName || '')}
                onChangeText={(text) => {
                  if (editedProfile.userType === 'student') {
                    setEditedProfile({ ...editedProfile, collegeName: text });
                  } else {
                    setEditedProfile({ ...editedProfile, organizationName: text });
                  }
                }}
                placeholder={`Enter ${getInstitutionLabel().toLowerCase()} name`}
                placeholderTextColor="#8B8B8B"
              />
            ) : (
              <Text style={styles.inputValue}>{getInstitutionName() || 'Not specified'}</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.location || ''}
                onChangeText={(text) => setEditedProfile({ ...editedProfile, location: text })}
                placeholder="Enter your location (City, State)"
                placeholderTextColor="#8B8B8B"
              />
            ) : (
              <Text style={styles.inputValue}>{profile.location || 'Not specified'}</Text>
            )}
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={editedProfile.bio || ''}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, bio: text })}
              placeholder="Tell others about yourself..."
              placeholderTextColor="#8B8B8B"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.bio}>{profile.bio || 'No bio available'}</Text>
          )}
        </View>

        {/* Skills I Can Teach */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Can Teach</Text>
            {editing && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addSkill('canTeach')}
              >
                <Icon name="add" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.skillsContainer}>
            {(editing ? editedProfile.canTeach : profile.canTeach)?.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
                {editing && (
                  <TouchableOpacity
                    style={styles.removeSkillButton}
                    onPress={() => removeSkill('canTeach', index)}
                  >
                    <Icon name="close" size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {((editing ? editedProfile.canTeach : profile.canTeach) || []).length === 0 && (
              <Text style={styles.noSkillsText}>No teaching skills added</Text>
            )}
          </View>
        </View>

        {/* Skills I Want to Learn */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Want to Learn</Text>
            {editing && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addSkill('wantToLearn')}
              >
                <Icon name="add" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.skillsContainer}>
            {(editing ? editedProfile.wantToLearn : profile.wantToLearn)?.map((skill, index) => (
              <View key={index} style={[styles.skillTag, styles.wantToLearnTag]}>
                <Text style={[styles.skillText, styles.wantToLearnText]}>{skill}</Text>
                {editing && (
                  <TouchableOpacity
                    style={styles.removeSkillButton}
                    onPress={() => removeSkill('wantToLearn', index)}
                  >
                    <Icon name="close" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {((editing ? editedProfile.wantToLearn : profile.wantToLearn) || []).length === 0 && (
              <Text style={styles.noSkillsText}>No learning goals added</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditedProfile(profile);
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Icon name="logout" size={20} color="#FF6B6B" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Custom Modal for Android */}
      <Modal
        visible={showSkillModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSkillModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Skill</Text>
            <Text style={styles.modalSubtitle}>
              {skillModalType === 'canTeach' ? 'Teaching Skills' : 'Learning Goals'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newSkill}
              onChangeText={setNewSkill}
              placeholder="Enter skill name..."
              placeholderTextColor="#8B8B8B"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSkillModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddSkill}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B8B8B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
  errorText: {
    fontSize: 16,
    color: '#8B8B8B',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    color: '#FFFFFF',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
    color: '#8B8B8B',
    marginBottom: 4,
  },
  editButton: {
    padding: 8,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#0F0F23',
  },
  inputValue: {
    fontSize: 16,
    color: '#8B8B8B',
    paddingVertical: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F0F23',
  },
  picker: {
    height: 50,
    color: '#FFFFFF',
  },
  bio: {
    fontSize: 16,
    color: '#8B8B8B',
    lineHeight: 22,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#0F0F23',
    textAlignVertical: 'top',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#0F0F23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  skillText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  wantToLearnTag: {
    backgroundColor: '#0F0F23',
    borderColor: '#2D2D48',
  },
  wantToLearnText: {
    color: '#FF6B6B',
  },
  removeSkillButton: {
    marginLeft: 8,
  },
  noSkillsText: {
    fontSize: 14,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
  actionsContainer: {
    margin: 15,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#2D2D48',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#8B8B8B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#8B8B8B',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#0F0F23',
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#2D2D48',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#8B8B8B',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalAddText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;