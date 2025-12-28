import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../supabase';

export default function DietChartScreen({ onDietSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data State
  const [mealCount, setMealCount] = useState(0);
  const [targets, setTargets] = useState({}); // Stores { "1": "500", "2": "600" }
  const [totalCalories, setTotalCalories] = useState(0);

  // 1. Fetch the User's Meal Preference
  useEffect(() => {
    fetchProfileSettings();
  }, []);

  // Update total whenever inputs change
  useEffect(() => {
    let sum = 0;
    Object.values(targets).forEach(val => {
      sum += parseInt(val || 0);
    });
    setTotalCalories(sum);
  }, [targets]);

  async function fetchProfileSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('number_of_meals')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setMealCount(data.number_of_meals || 3); // Default to 3 if null
    } catch (error) {
      Alert.alert("Error", "Could not fetch your settings.");
    } finally {
      setLoading(false);
    }
  }

  // Handle text change for a specific meal slot
  const handleInputChange = (mealNumber, value) => {
    setTargets(prev => ({
      ...prev,
      [mealNumber]: value
    }));
  };

  // 2. Save Logic
  async function handleSaveTargets() {
    // Check if all slots are filled
    if (Object.keys(targets).length < mealCount) {
      Alert.alert("Incomplete", "Please set a target for every meal slot.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Prepare the array for bulk insert
      const updates = [];
      for (let i = 1; i <= mealCount; i++) {
        updates.push({
          user_id: user.id,
          meal_number: i,
          target_calories: parseInt(targets[i] || 0),
          meal_description: `Meal ${i}`
        });
      }

      // Upsert to Supabase
      const { error } = await supabase
        .from('diet_targets')
        .upsert(updates, { onConflict: 'user_id, meal_number' });

      if (error) throw error;

      console.log("Diet Plan Saved!");
      // Notify App.js to re-check status and move to Dashboard
      onDietSaved();
      
    } catch (error) {
      Alert.alert("Save Error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF8C00" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Design Your Diet</Text>
          <Text style={styles.subtitle}>
            You have {mealCount} meal slots. Assign a calorie target to each.
          </Text>
        </View>

        {/* DYNAMIC MEAL INPUTS */}
        <View style={styles.list}>
          {Array.from({ length: mealCount }, (_, i) => i + 1).map((num) => (
            <View key={num} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.mealLabel}>Meal {num}</Text>
                <Text style={styles.calLabel}>CALORIES</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                placeholderTextColor="#667085"
                keyboardType="numeric"
                value={targets[num]}
                onChangeText={(text) => handleInputChange(num, text)}
              />
            </View>
          ))}
        </View>

        {/* FOOTER SUMMARY */}
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL DAILY TARGET:</Text>
            <Text style={styles.totalValue}>{totalCalories} kcal</Text>
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveTargets}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>FINALIZE PLAN</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F', // Deep Navy
  },
  center: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  header: {
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
  },
  list: {
    gap: 15,
  },
  card: {
    backgroundColor: '#112240',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233554',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealLabel: {
    color: '#FF8C00', // Orange
    fontWeight: 'bold',
    fontSize: 16,
  },
  calLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0A192F',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#233554',
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#233554',
    paddingTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});