import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl, 
  Dimensions,
  Animated,
  Image
} from 'react-native';
import { supabase } from '../supabase';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- COMPONENT: PROGRESS RING ---
const ProgressRing = ({ radius, stroke, progress, target, consumed }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  // Cap progress at 100% for visual sanity (even if they overeat)
  const safeOffset = strokeDashoffset < 0 ? 0 : strokeDashoffset;

  return (
    <View style={styles.ringContainer}>
      <Svg height={radius * 2} width={radius * 2}>
        <G rotation="-90" origin={`${radius}, ${radius}`}>
          {/* Background Grey Circle */}
          <Circle
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Foreground Orange Circle */}
          <Circle
            stroke="#FF8C00"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={safeOffset}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </G>
      </Svg>
      {/* Inner Text Overlay */}
      <View style={styles.ringInner}>
        <Text style={styles.ringPercentage}>{Math.round(progress)}%</Text>
        <Text style={styles.ringSubtitle}>{target - consumed} kcal left</Text>
      </View>
    </View>
  );
};

// --- COMPONENT: BASIC PROFILE CARD ---
const ProfileCard = ({ name, currentWeight, targetWeight, streak, onIconPress, profileImageUrl }) => {
  const displayName = name || 'User';
  const displayCurrentWeight = currentWeight !== null && currentWeight !== undefined ? currentWeight : '-';
  const displayTargetWeight = targetWeight !== null && targetWeight !== undefined ? targetWeight : '-';
  const displayStreak = streak || 0;

  return (
    <View style={styles.profileCard}>
      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsBtn} onPress={onIconPress}>
        <Ionicons name="settings-outline" size={20} color="#FF8C00" />
      </TouchableOpacity>

      {/* Avatar and Name */}
      <View style={styles.profileTop}>
        <View style={styles.avatar}>
          {profileImageUrl ? (
            <Image 
              source={{ uri: profileImageUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.nameInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userSubtitle}>Fitness Tracker</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statItemLabel}>Goal Prog</Text>
          <Text style={styles.statItemValue}>{displayCurrentWeight}kg</Text>
          <Text style={styles.statItemSub}>→ {displayTargetWeight}kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statItemLabel}>Streak</Text>
          <Text style={styles.statItemValue}>{displayStreak}</Text>
          <Text style={styles.statItemSub}>days 🔥</Text>
        </View>
      </View>
    </View>
  );
};

// --- MAIN SCREEN ---
// Add 'onProfileClick' to props
export default function DashboardScreen({ onLogClick, onProfileClick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [profile, setProfile] = useState(null);
  const [targets, setTargets] = useState([]); // Array of planned meals
  const [logs, setLogs] = useState([]);       // Array of eaten meals
  const [streak, setStreak] = useState(0);    // Streak days
  
  // Calculated States
  const [totalTarget, setTotalTarget] = useState(1);
  const [totalConsumed, setTotalConsumed] = useState(0);

  // 1. AUTO-REFRESH: Runs once on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // A. Fetch Profile - fetch all available fields
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setProfile(null);
      } else if (profileData) {
        console.log('Profile data fetched successfully:', profileData);
        console.log('Profile Image URL:', profileData.profile_image_url);
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      // B. Fetch Diet Targets
      const { data: targetData, error: targetError } = await supabase
        .from('diet_targets')
        .select('*')
        .eq('user_id', user.id)
        .order('meal_number', { ascending: true });
      
      if (targetError) {
        console.log('Targets fetch error:', targetError);
      } else {
        setTargets(targetData || []);
      }

      // C. Fetch Today's Logs
      const { data: logData, error: logError } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`);
        
      if (logError) {
        console.log('Logs fetch error:', logError);
      } else {
        setLogs(logData || []);
      }

      // D. Calculate Streak (consecutive days with logs)
      const { data: allLogs, error: allLogsError } = await supabase
        .from('meal_logs')
        .select('logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false });

      let streakCount = 0;
      if (!allLogsError && allLogs && allLogs.length > 0) {
        const dates = allLogs.map(log => log.logged_at.split('T')[0]);
        const uniqueDates = [...new Set(dates)];
        
        const todayDate = new Date(today);
        for (let i = 0; i < uniqueDates.length; i++) {
          const logDate = new Date(uniqueDates[i]);
          const diffDays = Math.floor((todayDate - logDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === i) {
            streakCount = i + 1;
          } else {
            break;
          }
        }
      }
      setStreak(streakCount);

      // E. Calculations
      const tTarget = targetData?.reduce((sum, item) => sum + item.target_calories, 0) || 1;
      const tConsumed = logData?.reduce((sum, item) => sum + item.calories_consumed, 0) || 0;
      
      setTotalTarget(tTarget);
      setTotalConsumed(tConsumed);

    } catch (error) {
      console.log('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Helper to find if a specific meal slot is logged
  const getLogForMeal = (mealNum) => {
    return logs.find(log => log.meal_number === mealNum);
  };

  const progressPercent = Math.min((totalConsumed / totalTarget) * 100, 100);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    
    <View style={styles.container}>
      {/* 1. GLASS PROFILE HEADER */}
      <View style={styles.headerContainer}>
        <ProfileCard 
          name={profile?.full_name} 
          currentWeight={profile?.current_weight}
          targetWeight={profile?.target_weight}
          streak={streak}
          onIconPress={onProfileClick}
          profileImageUrl={profile?.profile_image_url}
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF8C00"/>}
      >
        
        {/* 2. HERO SECTION: PROGRESS RING + STATS */}
        <View style={styles.heroSection}>
          {/* CENTER: Progress Ring */}
          <ProgressRing 
            radius={104} 
            stroke={14} 
            progress={progressPercent} 
            target={totalTarget} 
            consumed={totalConsumed} 
          />

          {/* BELOW: All Stats in Single Rounded Box */}
          <View
            style={styles.statsBoxGradient}
          >
            <View style={styles.statsBox}>
              {/* Goal Mode */}
              <View style={styles.statBoxItem}>
                <Text style={styles.statBoxLabel}>Goal</Text>
                <Text style={styles.statBoxValue}>{profile?.goal_mode ? profile.goal_mode.toUpperCase() : 'BULK'}</Text>
              </View>

              {/* Divider */}
              <View style={styles.statBoxDivider} />

              {/* Eaten */}
              <View style={styles.statBoxItem}>
                <Text style={styles.statBoxLabel}>Eaten</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.statBoxValue}>{totalConsumed}</Text>
                  <Text style={styles.statBoxUnit}>kcal</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.statBoxDivider} />

              {/* Target */}
              <View style={styles.statBoxItem}>
                <Text style={styles.statBoxLabel}>Target</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={styles.statBoxValue}>{totalTarget}</Text>
                  <Text style={styles.statBoxUnit}>kcal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 3. MEAL LIST */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        <View style={styles.listContainer}>
          {targets.map((meal) => {
            const log = getLogForMeal(meal.meal_number);
            const isLogged = !!log;

            return (
              <TouchableOpacity 
                key={meal.id} 
                style={[styles.mealCard, isLogged ? styles.loggedCard : styles.emptyCard]}
                onPress={() => {
                  if (onLogClick) {
                    onLogClick({ 
                      mealNumber: meal.meal_number, 
                      targetCalories: meal.target_calories 
                    });
                  }
                }}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconBox, isLogged ? styles.iconLogged : styles.iconEmpty]}>
                    <Ionicons 
                      name={isLogged ? "checkmark" : "add"} 
                      size={24} 
                      color={isLogged ? "#fff" : "#FF8C00"} 
                    />
                  </View>
                  <View>
                    <Text style={styles.mealTitle}>Meal {meal.meal_number}</Text>
                    <Text style={styles.mealSub}>
                      {isLogged ? log.food_name : `${meal.target_calories} kcal target`}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                   {isLogged ? (
                     <Text style={styles.calTextActive}>{log.calories_consumed} kcal</Text>
                   ) : (
                     <Ionicons name="chevron-forward" size={20} color="#667085" />
                   )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F', // Deep Navy
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // NEW PROFILE CARD STYLES
  profileCard: {
    backgroundColor: '#112240',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233554',
    gap: 16,
  },
  settingsBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  nameInfo: {
    gap: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userSubtitle: {
    color: '#a8b5c9',
    fontSize: 12,
    fontWeight: '600',
  },
  profileStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statItemLabel: {
    color: '#a8b5c9',
    fontSize: 8.4,
    fontWeight: '700',
    marginBottom: 4,
  },
  statItemValue: {
    color: '#FF8C00',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  statItemSub: {
    color: '#667085',
    fontSize: 7.5,
    fontWeight: '600',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  nameSection: {
    gap: 2,
    flex: 1,
  },
  welcomeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#a8b5c9',
    fontSize: 12,
    fontWeight: '600',
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  headerStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  headerStatLabel: {
    color: '#a8b5c9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerStatValue: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerStatSubtitle: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statLabel: {
    color: '#a8b5c9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FF8C00',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statSubtitle: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statExtra: {
    color: '#FF8C00',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  weightDiff: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  weightDiffPositive: {
    color: '#7ED321',
  },
  weightDiffNegative: {
    color: '#FF6B6B',
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
    gap: 20,
    width: '100%',
  },
  heroBottom: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalModeTextBoxGradient: {
    borderRadius: 14,
    padding: 0,
    overflow: 'hidden',
    flex: 1,
  },
  goalModeTextBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    alignItems: 'center',
  },
  goalModeLabel: {
    color: '#a8b5c9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  goalModeValue: {
    color: '#FF8C00',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsBoxGradient: {
    borderRadius: 14,
    padding: 0,
    overflow: 'hidden',
    width: '100%',
    marginTop: 10,
  },
  statsBox: {
    backgroundColor: 'rgba(17, 34, 64, 0.8)',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#233554',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statBoxItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxLabel: {
    color: '#a8b5c9',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  statBoxValue: {
    color: '#FF8C00',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statBoxUnit: {
    color: '#667085',
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
  statBoxDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#233554',
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringPercentage: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  ringSubtitle: {
    color: '#8892b0',
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#233554',
    marginHorizontal: 15,
  },
  // List Section
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listContainer: {
    gap: 12,
  },
  mealCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyCard: {
    backgroundColor: '#112240',
    borderColor: '#233554',
  },
  loggedCard: {
    backgroundColor: '#132a4a', // Slightly Lighter Navy
    borderColor: '#FF8C00', // Orange Border
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmpty: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
  },
  iconLogged: {
    backgroundColor: '#FF8C00',
  },
  mealTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mealSub: {
    color: '#8892b0',
    fontSize: 13,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calTextActive: {
    color: '#FF8C00',
    fontWeight: 'bold',
    fontSize: 16,
  },
});