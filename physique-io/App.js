import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from './supabase';

// Import all your screens
import AuthScreen from './screens/AuthScreen';
import SetupScreen from './screens/SetupScreen';
import DietChartScreen from './screens/DietChartScreen';
import DashboardScreen from './screens/DashboardScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State to track user progress
  const [hasProfileData, setHasProfileData] = useState(false);
  const [hasDietChart, setHasDietChart] = useState(false);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for Login/Logout/Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserStatus(session.user.id);
      } else {
        // Reset state on logout
        setHasProfileData(false);
        setHasDietChart(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔍 Check user's progress: Profile data + Diet targets
  async function checkUserStatus(userId) {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('age, goal_mode')
        .eq('id', userId);

      if (profileError) {
        console.log("Profile Error:", profileError);
        setHasProfileData(false);
        setHasDietChart(false);
        setLoading(false);
        return;
      }

      // Check if profile has age (complete profile)
      if (profile && profile.length > 0 && profile[0].age) {
        setHasProfileData(true);
        
        // Check if user has diet targets
        const { data: targets, error: targetsError } = await supabase
          .from('diet_targets')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        
        if (!targetsError && targets && targets.length > 0) {
          setHasDietChart(true);
        } else {
          setHasDietChart(false);
        }
      } else {
        // Profile exists but no age (incomplete)
        setHasProfileData(false);
        setHasDietChart(false);
      }
    } catch (error) {
      console.log("Check Status Error:", error);
      setHasProfileData(false);
      setHasDietChart(false);
    } finally {
      setLoading(false);
    }
  }

  // ⏳ Show Loading Spinner while checking session/profile
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  // 🚦 Navigation Logic
  // Step 1: No active session → Show Auth Screen
  if (!session) {
    return <AuthScreen />;
  }

  // Step 2: Has session but no profile age → Show Setup Screen
  if (!hasProfileData) {
    return (
      <SetupScreen 
        onProfileSaved={() => checkUserStatus(session.user.id)}
        onGoBack={async () => {
          await supabase.auth.signOut();
        }}
      />
    );
  }

  // Step 3: Has profile but no diet targets → Show Diet Chart Screen
  if (!hasDietChart) {
    return (
      <DietChartScreen 
        onDietSaved={() => checkUserStatus(session.user.id)}
        onGoBack={() => {
          setHasProfileData(false);
        }}
      />
    );
  }

  // Step 4: Has everything → Show Dashboard
  return <DashboardScreen />;
}