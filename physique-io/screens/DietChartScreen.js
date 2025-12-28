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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';

export default function DietChartScreen({ onDietSaved, onGoBack }) {
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BACK BUTTON */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onGoBack}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* PROGRESS INDICATOR */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(Object.keys(targets).length / mealCount) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Object.keys(targets).length} of {mealCount} meals set
          </Text>
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Design Your Diet</Text>
          <Text style={styles.subtitle}>
            Set calorie targets for each meal
          </Text>
        </View>

        {/* DYNAMIC MEAL INPUTS */}
        <View style={styles.list}>
          {Array.from({ length: mealCount }, (_, i) => i + 1).map((num) => (
            <LinearGradient
              key={num}
              colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.mealNumberBadge}>
                    <Text style={styles.mealNumber}>{num}</Text>
                  </View>
                  <Text style={styles.mealLabel}>Meal {num}</Text>
                  <View style={styles.caloriesBadge}>
                    <Text style={styles.calLabel}>KCAL</Text>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="500"
                    placeholderTextColor="#667085"
                    keyboardType="numeric"
                    value={targets[num]}
                    onChangeText={(text) => handleInputChange(num, text)}
                  />
                  {targets[num] && (
                    <View style={styles.inputDeco}>
                      <Text style={styles.inputDecoText}>✓</Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          ))}
        </View>

        {/* FOOTER SUMMARY */}
        <View style={styles.footerSection}>
          <LinearGradient
            colors={['rgba(255, 140, 0, 0.15)', 'rgba(255, 140, 0, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCardGradient}
          >
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>DAILY TARGET</Text>
              <View style={styles.totalValueContainer}>
                <Text style={styles.totalValue}>{totalCalories}</Text>
                <Text style={styles.totalUnit}>kcal</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#FF8C00', '#FF6B00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveTargets}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>FINALIZE PLAN</Text>
                  <Text style={styles.saveButtonArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  center: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
  },
  
  /* PROGRESS SECTION */
  progressSection: {
    marginBottom: 28,
    marginTop: 12,
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF8C00',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#a8b5c9',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* HEADER */
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8b5c9',
    fontWeight: '500',
    lineHeight: 24,
  },

  /* MEAL LIST */
  list: {
    gap: 14,
    marginBottom: 28,
  },
  cardGradient: {
    borderRadius: 14,
    padding: 0,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  mealNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  mealNumber: {
    color: '#FF8C00',
    fontWeight: '800',
    fontSize: 16,
  },
  mealLabel: {
    color: '#ccd6f6',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  caloriesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  calLabel: {
    color: '#a8b5c9',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    padding: 13,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inputDeco: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputDecoText: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* FOOTER */
  footerSection: {
    gap: 14,
  },
  totalCardGradient: {
    borderRadius: 14,
    padding: 0,
  },
  totalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#a8b5c9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalValue: {
    color: '#FF8C00',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  totalUnit: {
    color: '#a8b5c9',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButtonGradient: {
    borderRadius: 14,
    marginTop: 24,
    overflow: 'hidden',
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  saveButtonArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});