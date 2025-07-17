import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

const ProfileSetupScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { profile, setProfile, profileLoading } = useProfile();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [canTeach, setCanTeach] = useState('');
  const [wantToLearn, setWantToLearn] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileLoading && profile) {
      navigation.navigate('Main');
    }
  }, [profile, profileLoading, navigation]);

  const handleSaveProfile = async () => {
    if (!name || !bio || !canTeach || !wantToLearn) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        name,
        bio,
        canTeach: canTeach.split(',').map(skill => skill.trim()),
        wantToLearn: wantToLearn.split(',').map(skill => skill.trim()),
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      setProfile(profileData);
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Complete Your Profile</Text>
        
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor="#8B8B8B"
        />
        
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself"
          placeholderTextColor="#8B8B8B"
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>Skills I Can Teach</Text>
        <TextInput
          style={styles.input}
          value={canTeach}
          onChangeText={setCanTeach}
          placeholder="e.g., JavaScript, Python, Guitar"
          placeholderTextColor="#8B8B8B"
        />
        <Text style={styles.hint}>Separate skills with commas</Text>
        
        <Text style={styles.label}>Skills I Want to Learn</Text>
        <TextInput
          style={styles.input}
          value={wantToLearn}
          onChangeText={setWantToLearn}
          placeholder="e.g., React Native, Photography, Spanish"
          placeholderTextColor="#8B8B8B"
        />
        <Text style={styles.hint}>Separate skills with commas</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    color: '#FFFFFF',
    fontSize: 16,
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#8B8B8B',
    marginBottom: 15,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileSetupScreen;