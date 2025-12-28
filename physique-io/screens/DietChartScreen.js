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
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  center: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(136, 146, 176, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(136, 146, 176, 0.2)',
  },
  backButtonText: {
    color: '#8892b0',
    fontWeight: '600',
    fontSize: 14,
  },
  
  /* PROGRESS SECTION */
  progressSection: {
    marginBottom: 32,
    marginTop: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(136, 146, 176, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF8C00',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#8892b0',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* HEADER */
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8892b0',
    fontWeight: '500',
    lineHeight: 24,
  },

  /* MEAL LIST */
  list: {
    gap: 16,
    marginBottom: 28,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 1,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    backgroundColor: 'rgba(17, 34, 64, 0.6)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    backdropFilter: 'blur(20px)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  mealNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
  },
  mealNumber: {
    color: '#FF8C00',
    fontWeight: '800',
    fontSize: 18,
  },
  mealLabel: {
    color: '#ccd6f6',
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
  },
  caloriesBadge: {
    backgroundColor: 'rgba(136, 146, 176, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(136, 146, 176, 0.2)',
  },
  calLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputContainer: {
    position: 'relative',
    borderRadius: 12,
  },
  input: {
    backgroundColor: 'rgba(10, 25, 47, 0.8)',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputDeco: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputDecoText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: 'bold',
  },

  /* FOOTER */
  footerSection: {
    gap: 16,
  },
  totalCardGradient: {
    borderRadius: 16,
    padding: 1,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  totalCard: {
    backgroundColor: 'rgba(17, 34, 64, 0.7)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
    alignItems: 'center',
    backdropFilter: 'blur(20px)',
  },
  totalLabel: {
    color: '#8892b0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalValue: {
    color: '#FF8C00',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  totalUnit: {
    color: '#8892b0',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.2,
  },
  saveButtonArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});