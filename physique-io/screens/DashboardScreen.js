import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { supabase } from '../supabase';

export default function DashboardScreen({ navigation }) {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    }
    // Navigation will happen automatically when user state changes
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to your dashboard!</Text>
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#BB86FC',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#BB86FC',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
