import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AuthScreen from './src/screens/AuthScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import SkillMatchScreen from './src/screens/SkillMatchScreen';
import ProfileViewScreen from './src/screens/ProfileViewScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen'; // New profile management screen

import { AuthProvider } from './src/contexts/AuthContext';
import { ProfileProvider } from './src/contexts/ProfileContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ✅ Updated Bottom tabs with Profile instead of Schedule
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Matches') {
          iconName = 'people';
        } else if (route.name === 'Chats') {
          iconName = 'chat';
        } else if (route.name === 'Profile') {
          iconName = 'account-circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0ff',
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Matches" component={SkillMatchScreen} />
    <Tab.Screen name="Chats" component={ChatListScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ✅ Main app component
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Loading Skill Swap...
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : (
              <>
                <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                <Stack.Screen name="Main" component={MainTabNavigator} />
                <Stack.Screen 
                  name="Chat" 
                  component={ChatScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="ProfileView" 
                  component={ProfileViewScreen}
                  options={{ 
                    headerShown: true,
                    headerTitle: 'Profile',
                    headerBackTitle: 'Back'
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;