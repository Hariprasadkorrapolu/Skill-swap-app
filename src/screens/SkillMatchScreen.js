import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import SkillCard from '../components/SkillCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SkillMatchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    matchType: 'matched',
    userType: 'all',
    location: '',
    collegeName: '',
    organizationName: '',
  });
  const [tempFilters, setTempFilters] = useState(selectedFilters);
  const [sortBy, setSortBy] = useState('relevance');
  const [tempSortBy, setTempSortBy] = useState(sortBy);

  const fetchMatches = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const allUsers = await getDocs(usersRef);
      const matchedUsers = [];
      const nonMatchedUsers = [];

      allUsers.forEach((doc) => {
        const userData = doc.data();
        if (userData.userId !== user.uid && userData.canTeach) {
          const hasMatch = profile.wantToLearn?.some(skill =>
            userData.canTeach.some(teachSkill =>
              teachSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(teachSkill.toLowerCase())
            )
          );

          if (hasMatch) {
            matchedUsers.push({ ...userData, isMatch: true });
          } else {
            nonMatchedUsers.push({ ...userData, isMatch: false });
          }
        }
      });

      const allPotentialMatches = [...matchedUsers, ...nonMatchedUsers];
      setMatches(allPotentialMatches);
      setFilteredMatches(allPotentialMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [matches, searchText, selectedFilters, sortBy]);

  const applyFilters = () => {
    let filtered = matches;

    // Apply match type filter
    if (selectedFilters.matchType === 'matched') {
      filtered = filtered.filter(user => user.isMatch);
    } else if (selectedFilters.matchType === 'unmatched') {
      filtered = filtered.filter(user => !user.isMatch);
    }

    // Apply search filter
    if (searchText.trim()) {
      filtered = filtered.filter(user => {
        const searchLower = searchText.toLowerCase().trim();
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.bio?.toLowerCase().includes(searchLower) ||
          user.location?.toLowerCase().includes(searchLower) ||
          user.collegeName?.toLowerCase().includes(searchLower) ||
          user.organizationName?.toLowerCase().includes(searchLower) ||
          user.canTeach?.some(skill => skill.toLowerCase().includes(searchLower)) ||
          user.wantToLearn?.some(skill => skill.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply other filters
    if (selectedFilters.userType !== 'all') {
      filtered = filtered.filter(user => user.userType === selectedFilters.userType);
    }

    if (selectedFilters.location.trim()) {
      filtered = filtered.filter(user => 
        user.location?.toLowerCase().includes(selectedFilters.location.toLowerCase())
      );
    }

    if (selectedFilters.collegeName.trim()) {
      filtered = filtered.filter(user => 
        user.collegeName?.toLowerCase().includes(selectedFilters.collegeName.toLowerCase())
      );
    }

    if (selectedFilters.organizationName.trim()) {
      filtered = filtered.filter(user => 
        user.organizationName?.toLowerCase().includes(selectedFilters.organizationName.toLowerCase())
      );
    }

    // Apply sorting
    filtered = sortResults(filtered);
    setFilteredMatches(filtered);
  };

  const sortResults = (results) => {
    switch (sortBy) {
      case 'name':
        return results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'location':
        return results.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
      case 'recent':
        return results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'relevance':
      default:
        return results.sort((a, b) => {
          if (a.isMatch && !b.isMatch) return -1;
          if (!a.isMatch && b.isMatch) return 1;
          return 0;
        });
    }
  };

  const handleCardPress = (matchedUser) => {
    navigation.navigate('ProfileView', { user: matchedUser });
  };

  const openFilterModal = () => {
    setTempFilters(selectedFilters);
    setTempSortBy(sortBy);
    setShowFilterModal(true);
  };

  const applyFiltersFromModal = () => {
    setSelectedFilters(tempFilters);
    setSortBy(tempSortBy);
    setShowFilterModal(false);
  };

  const clearAllFilters = () => {
    const defaultFilters = {
      matchType: 'matched',
      userType: 'all',
      location: '',
      collegeName: '',
      organizationName: '',
    };
    setSelectedFilters(defaultFilters);
    setSortBy('relevance');
    setSearchText('');
  };

  const clearFilters = () => {
    const defaultFilters = {
      matchType: 'matched',
      userType: 'all',
      location: '',
      collegeName: '',
      organizationName: '',
    };
    setTempFilters(defaultFilters);
    setTempSortBy('relevance');
  };

  const closeFilterModal = () => {
    setShowFilterModal(false);
    setTempFilters(selectedFilters);
    setTempSortBy(sortBy);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedFilters.matchType !== 'matched') count++;
    if (selectedFilters.userType !== 'all') count++;
    if (selectedFilters.location.trim()) count++;
    if (selectedFilters.collegeName.trim()) count++;
    if (selectedFilters.organizationName.trim()) count++;
    if (sortBy !== 'relevance') count++;
    return count;
  };

  const renderMatch = ({ item }) => (
    <SkillCard
      user={item}
      onPress={() => handleCardPress(item)}
      currentUserSkills={profile?.wantToLearn || []}
      isMatch={item.isMatch}
    />
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={closeFilterModal}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeFilterModal} style={styles.modalButton}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={applyFiltersFromModal} style={styles.modalButton}>
              <Text style={styles.modalApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView 
            style={styles.modalContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Match Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Match Type</Text>
              <View style={styles.filterRow}>
                {[
                  { value: 'matched', label: 'Skill Matches' },
                  { value: 'all', label: 'All Users' },
                  { value: 'unmatched', label: 'Others' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempFilters.matchType === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setTempFilters(prev => ({ ...prev, matchType: option.value }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempFilters.matchType === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* User Type Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>User Type</Text>
              <View style={styles.filterRow}>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'student', label: 'Students' },
                  { value: 'organization', label: 'Organizations' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempFilters.userType === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setTempFilters(prev => ({ ...prev, userType: option.value }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempFilters.userType === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Location</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter location"
                value={tempFilters.location}
                onChangeText={(text) => setTempFilters(prev => ({ ...prev, location: text }))}
                placeholderTextColor="#8B8B8B"
              />
            </View>

            {/* College Name Filter */}
            {tempFilters.userType === 'student' && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>College Name</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter college name"
                  value={tempFilters.collegeName}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, collegeName: text }))}
                  placeholderTextColor="#8B8B8B"
                />
              </View>
            )}

            {/* Organization Name Filter */}
            {tempFilters.userType === 'organization' && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Organization Name</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter organization name"
                  value={tempFilters.organizationName}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, organizationName: text }))}
                  placeholderTextColor="#8B8B8B"
                />
              </View>
            )}

            {/* Sort Options */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Sort By</Text>
              <View style={styles.filterRow}>
                {[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'name', label: 'Name' },
                  { value: 'location', label: 'Location' },
                  { value: 'recent', label: 'Recent' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      tempSortBy === option.value && styles.filterOptionActive
                    ]}
                    onPress={() => setTempSortBy(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempSortBy === option.value && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear All Button */}
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearAllButton} onPress={clearFilters}>
                <Text style={styles.clearAllButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skill Matches</Text>
      
      {/* Search and Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills, names, locations..."
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            placeholderTextColor="#8B8B8B"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]} 
          onPress={openFilterModal}
        >
          <Text style={[styles.filterButtonText, getActiveFiltersCount() > 0 && styles.filterButtonTextActive]}>
            Filter
          </Text>
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters Bar with Clear All */}
      {getActiveFiltersCount() > 0 && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersText}>
            {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
          </Text>
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllFiltersButton}>
            <Text style={styles.clearAllFiltersText}>✕ Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Count */}
      {(searchText || getActiveFiltersCount() > 0) && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {filteredMatches.length} result{filteredMatches.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={filteredMatches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.userId}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchMatches} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {selectedFilters.matchType === 'matched' 
                ? 'No skill matches found'
                : getActiveFiltersCount() > 0 || searchText
                ? 'No matches found'
                : 'No users found'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilters.matchType === 'matched' 
                ? 'Update your profile with skills you want to learn, or try "All Users" filter'
                : getActiveFiltersCount() > 0 || searchText
                ? 'Try adjusting your search or filters'
                : 'Check back later for more users'
              }
            </Text>
          </View>
        }
        style={styles.resultsList}
      />

      {/* Filter Modal */}
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    color: '#FFFFFF',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#8B8B8B',
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D48',
    position: 'relative',
    minWidth: 85,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  clearAllFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  clearAllFiltersText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2D2D48',
    marginBottom: 10,
  },
  resultsText: {
    fontSize: 14,
    color: '#8B8B8B',
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8B8B',
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.8,
    width: screenWidth,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D48',
    backgroundColor: '#1A1A2E',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8B8B8B',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalApplyText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  filterGroup: {
    marginBottom: 28,
  },
  filterGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F0F23',
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  filterOptionActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#2D2D48',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#0F0F23',
    color: '#FFFFFF',
  },
  filterActions: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2D2D48',
  },
  clearAllButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0F0F23',
    borderWidth: 1,
    borderColor: '#2D2D48',
  },
  clearAllButtonText: {
    fontSize: 16,
    color: '#8B8B8B',
    fontWeight: '500',
  },
});

export default SkillMatchScreen;