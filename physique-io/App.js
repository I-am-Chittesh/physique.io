import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from './supabase';
import { StatusBar } from 'expo-status-bar';

// Import all your screens
import AuthScreen from './screens/AuthScreen';
import SetupScreen from './screens/SetupScreen';
import DietChartScreen from './screens/DietChartScreen';
import DashboardScreen from './screens/DashboardScreen';
import LogMealScreen from './screens/LogMealScreen'; // <--- Make sure this is imported
import ProfileScreen from './screens/ProfileScreen';

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
  const handleNavigate = (screenName, params) => {
    if (screenName === 'LogMealScreen') {
      setLogParams(params);
      setCurrentView('logMeal');
    } else if (screenName === 'ProfileScreen') {
      // NEW: Switch to Profile View
      setCurrentView('profile');
    }
  };

  const handleBackToDash = () => {
    setCurrentView('dashboard');
  };

 // 🚦 RENDER LOGIC
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
        <StatusBar style="light" /> 
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }
  
  if (!hasProfileData) {
    return (
      <>
        <StatusBar style="light" />
        <SetupScreen onComplete={() => checkUserStatus(session.user.id)} />
      </>
    );
  }

  if (!hasDietChart) {
    return (
      <>
        <StatusBar style="light" />
        <DietChartScreen onComplete={() => checkUserStatus(session.user.id)} />
      </>
    );
  }

  // --- VIEW SWITCHER ---
  return (
    <>
      <StatusBar style="light" />
      {currentView === 'logMeal' ? (
        <LogMealScreen 
          route={{ params: logParams }} 
          navigation={{ goBack: handleBackToDash }} 
        />
      ) : currentView === 'profile' ? (
        <ProfileScreen onBack={handleBackToDash} />
      ) : (
        <DashboardScreen 
          onLogClick={(params) => handleNavigate('LogMealScreen', params)} 
          onProfileClick={() => handleNavigate('ProfileScreen')} 
        />
      )}
    </>
  );
}