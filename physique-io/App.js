import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from './supabase';

// Import all your screens
import AuthScreen from './screens/AuthScreen';
import SetupScreen from './screens/SetupScreen';
import DietChartScreen from './screens/DietChartScreen';
import DashboardScreen from './screens/DashboardScreen';
import LogMealScreen from './screens/LogMealScreen'; // <--- Make sure this is imported

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // User Data Status
  const [hasProfileData, setHasProfileData] = useState(false);
  const [hasDietChart, setHasDietChart] = useState(false);

  // 🧭 MANUAL NAVIGATION STATE
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'logMeal'
  const [logParams, setLogParams] = useState(null); // To pass mealNumber to the log screen

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUserStatus(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserStatus(session.user.id);
      } else {
        // Reset everything on logout
        setHasProfileData(false);
        setHasDietChart(false);
        setCurrentView('dashboard');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserStatus(userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', userId)
        .single();

      if (profile && profile.age) {
        setHasProfileData(true);
        
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

  // ... keep all your imports and checks (checkUserStatus, etc.) above this ...

  // --- NAVIGATION HANDLERS ---
  const handleLogClick = (params) => {
    console.log("Navigating to Log Meal:", params); // DEBUG LOG
    setLogParams(params);
    setCurrentView('logMeal');
  };

  const handleBackToDash = () => {
    setCurrentView('dashboard');
  };

  // 🚦 RENDER LOGIC
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  if (!session) return <AuthScreen />;
  
  if (!hasProfileData) {
    return <SetupScreen onComplete={() => checkUserStatus(session.user.id)} />;
  }

  if (!hasDietChart) {
    return <DietChartScreen onComplete={() => checkUserStatus(session.user.id)} />;
  }

  // --- THE SWITCHER ---
  if (currentView === 'logMeal') {
    return (
      <LogMealScreen 
        route={{ params: logParams }} 
        navigation={{ goBack: handleBackToDash }} 
      />
    );
  }

  // Default: Dashboard
  // NOTICE: We are passing 'onLogClick' directly now
  return (
    <DashboardScreen 
      onLogClick={handleLogClick} 
    />
  );
}