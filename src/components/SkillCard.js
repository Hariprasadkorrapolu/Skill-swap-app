import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const SkillCard = ({ user, onPress, currentUserSkills = [] }) => {
  const getMatchedSkills = () => {
    if (!user.canTeach || !currentUserSkills) return [];
        
    return user.canTeach.filter(skill =>
      currentUserSkills.some(userSkill =>
        userSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
  };

  const matchedSkills = getMatchedSkills();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.matchCount}>
          {matchedSkills.length} match{matchedSkills.length !== 1 ? 'es' : ''}
        </Text>
      </View>
            
      <Text style={styles.bio} numberOfLines={2}>
        {user.bio}
      </Text>
            
      <View style={styles.skillsContainer}>
        <Text style={styles.skillsLabel}>Can teach:</Text>
        <View style={styles.skillsRow}>
          {matchedSkills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {matchedSkills.length > 3 && (
            <Text style={styles.moreSkills}>+{matchedSkills.length - 3} more</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2D2D48',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  matchCount: {
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    color: '#8B8B8B',
    marginBottom: 10,
  },
  skillsContainer: {
    marginTop: 5,
  },
  skillsLabel: {
    fontSize: 12,
    color: '#8B8B8B',
    marginBottom: 5,
    fontWeight: '500',
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  skillTag: {
    backgroundColor: '#0F0F23',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  skillText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#8B8B8B',
    marginLeft: 5,
  },
});

export default SkillCard;