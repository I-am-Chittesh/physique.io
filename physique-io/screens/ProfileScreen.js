import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

// Add 'onBack' to props
export default function ProfileScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activityData, setActivityData] = useState({});

  useEffect(() => {
    fetchProfileAndActivity();
  }, []);

  const fetchProfileAndActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile Stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserData(profile);

      // 2. Fetch last 30 days of logs for the grid
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs } = await supabase
        .from('meal_logs')
        .select('logged_at, meal_number')
        .eq('user_id', user.id)
        .gte('logged_at', thirtyDaysAgo.toISOString());

      // 3. Process logs into a "Date Map" { '2023-12-28': count }
      const counts = {};
      logs.forEach(log => {
        const date = log.logged_at.split('T')[0];
        counts[date] = (counts[date] || 0) + 1;
      });
      setActivityData(counts);

    } catch (error) {
      console.log("Profile Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
  };

  // Generate 8 weeks x 7 days grid
  const renderGrid = () => {
    const weeks = [];
    const today = new Date();
    const eightWeeksAgo = new Date(today);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    for (let week = 0; week < 8; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const d = new Date(eightWeeksAgo);
        d.setDate(d.getDate() + week * 7 + day);
        const dateStr = d.toISOString().split('T')[0];
        const count = activityData[dateStr] || 0;

        let color = '#0A1929'; // Grey - no meals
        if (count >= 1) color = '#23C952'; // Bright green - 1+ meals

        days.push(
          <View
            key={dateStr}
            style={[styles.gitHubSquare, { backgroundColor: color }]}
          />
        );
      }
      weeks.push(
        <View key={`week-${week}`} style={styles.weekColumn}>
          {days}
        </View>
      );
    }
    return weeks;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF8C00" /></View>;

  const weightDiff = userData ? (userData.target_weight - userData.current_weight).toFixed(1) : 0;

  return (
    <ScrollView style={styles.container}>
      {/* NEW: Back Button */}
      <TouchableOpacity 
        onPress={onBack} 
        style={{ marginTop: 50, marginBottom: 10, alignSelf: 'flex-start' }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.avatar}>
          {userData?.profile_image_url ? (
            <Image 
              source={{ uri: userData.profile_image_url }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{userData?.full_name?.charAt(0)}</Text>
          )}
        </View>
        <Text style={styles.name}>{userData?.full_name}</Text>
        <Text style={styles.subText}>{userData?.goal_mode?.toUpperCase()}</Text>
      </View>

      {/* WEIGHT PROGRESS CARD */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statVal}>{userData?.current_weight}kg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Target</Text>
          <Text style={styles.statVal}>{userData?.target_weight}kg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={[styles.statVal, {color: '#FF8C00'}]}>{Math.abs(weightDiff)}kg</Text>
        </View>
      </View>

      {/* CONSISTENCY GRID */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consistency (Last 8 Weeks)</Text>
        <View style={styles.gridWrapper}>
          {renderGrid()}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>No activity</Text>
          <View style={[styles.miniSquare, {backgroundColor: '#0A1929'}]} />
          <Text style={styles.legendText}>Logged meal</Text>
          <View style={[styles.miniSquare, {backgroundColor: '#23C952'}]} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
        <Text style={styles.logoutText}>Logout Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A192F', padding: 20 },
  center: { flex: 1, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FF8C00', justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarText: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subText: { color: '#8892b0', fontSize: 14, letterSpacing: 1, marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: '#112240', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#233554' },
  statLabel: { color: '#8892b0', fontSize: 12, marginBottom: 5 },
  statVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  section: { backgroundColor: '#112240', padding: 20, borderRadius: 20, marginBottom: 30 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  gridWrapper: { flexDirection: 'row', gap: 6, marginBottom: 20, overflow: 'scroll', justifyContent: 'center' },
  weekColumn: { flexDirection: 'column', gap: 3 },
  gitHubSquare: { width: 16, height: 16, borderRadius: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 8, flexWrap: 'wrap' },
  legendText: { color: '#8892b0', fontSize: 11, fontWeight: '500' },
  miniSquare: { width: 12, height: 12, borderRadius: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, marginBottom: 50 },
  logoutText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 16 }
});