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
      if (session) checkUserStatus(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for Login/Logout events
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

  // 🔍 The "Brain": Check what data the user has
  async function checkUserStatus(userId) {
    try {
      setLoading(true);

      // Check 1: Does user have physical stats (Age, Weight)?
      const { data: profile } = await supabase
        .from('profiles')
        .select('age, goal_mode')
        .eq('id', userId)
        .single();

      if (profile && profile.age) {
        setHasProfileData(true);
        
        // Check 2: Does user have a Diet Plan (Targets)?
        const { data: targets } = await supabase
          .from('diet_targets')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
          
        if (targets && targets.length > 0) {
          setHasDietChart(true);
        }
      }
    } catch (error) {
      console.log("Check Status Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ⏳ Show Loading Spinner while checking
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  // 🚦 The Traffic Logic
  // 1. Not Logged In -> Auth Screen
  if (!session) {
    return <AuthScreen />;
  }

  // 2. Logged In, but No Age/Weight -> Setup Screen
  if (!hasProfileData) {
    return <SetupScreen />;
  }

  // 3. Has Stats, but No Diet Targets -> Diet Chart Screen
  if (!hasDietChart) {
    return <DietChartScreen />;
  }

  // 4. Has Everything -> Dashboard
  return <DashboardScreen />;
}