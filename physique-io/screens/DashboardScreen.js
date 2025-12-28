import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl, 
  Dimensions 
} from 'react-native';
import { supabase } from '../supabase';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

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

// --- COMPONENT: GLASS PROFILE CARD ---
// Add 'onIconPress' to props
const GlassHeader = ({ name, goal, onIconPress }) => (
  <View style={styles.glassCard}>
    <View style={styles.glassContent}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{name ? name.charAt(0) : 'U'}</Text>
      </View>
      <View>
        <Text style={styles.welcomeText}>Hello, {name}</Text>
        <Text style={styles.goalText}>Current Goal: {goal ? goal.toUpperCase() : 'LOADING...'}</Text>
      </View>
    </View>
    {/* Update this TouchableOpacity */}
    <TouchableOpacity onPress={onIconPress}>
      <Ionicons name="settings-outline" size={24} color="rgba(255,255,255,0.6)" />
    </TouchableOpacity>
  </View>
);
// --- MAIN SCREEN ---
// Add 'onProfileClick' to props
export default function DashboardScreen({ onLogClick, onProfileClick }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [profile, setProfile] = useState({ full_name: '', goal_mode: '' });
  const [targets, setTargets] = useState([]); // Array of planned meals
  const [logs, setLogs] = useState([]);       // Array of eaten meals
  
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
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // A. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, goal_mode')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      // B. Fetch Diet Targets
      const { data: targetData } = await supabase
        .from('diet_targets')
        .select('*')
        .eq('user_id', user.id)
        .order('meal_number', { ascending: true });
      
      if (targetData) setTargets(targetData);

      // C. Fetch Today's Logs
      // Note: We filter logs where created_at starts with today's date
      const { data: logData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`);
        
      if (logData) setLogs(logData);

      // D. Calculations
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
        <GlassHeader 
          name={profile.full_name} 
          goal={profile.goal_mode} 
          onIconPress={onProfileClick}
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF8C00"/>}
      >
        
        {/* 2. HERO SECTION: PROGRESS RING */}
        <View style={styles.heroSection}>
          <ProgressRing 
            radius={80} 
            stroke={12} 
            progress={progressPercent} 
            target={totalTarget} 
            consumed={totalConsumed} 
          />
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Eaten</Text>
              <Text style={styles.statValue}>{totalConsumed}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>{totalTarget}</Text>
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
  // Glassmorphism Styles
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Transparent White
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
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
    marginTop: 20,
    backgroundColor: '#112240',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: '#233554',
  },
  statItem: {
    alignItems: 'center',
    width: 80,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#233554',
    marginHorizontal: 15,
  },
  statLabel: {
    color: '#8892b0',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    width: 40,
    height: 40,
    borderRadius: 12,
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