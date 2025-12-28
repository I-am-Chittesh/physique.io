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
  Platform,
  LinearGradient
} from 'react-native';
import { supabase } from '../supabase';

export default function SetupScreen({ onProfileSaved, onGoBack }) {
  const [loading, setLoading] = useState(false);
  
  // Input States
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('3'); // Default 3 meals
  
  // Goal Selection (bulk, cut, maintain)
  const [goal, setGoal] = useState('maintain');

  async function handleSaveProfile() {
    // 1. Validation
    if (!age || !height || !currentWeight || !targetWeight || !mealsPerDay) {
      Alert.alert("Missing Info", "Please fill in all your stats.");
      return;
    }

    setLoading(true);

    try {
      // 2. Get Current User ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // 3. Update Profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          age: parseInt(age),
          height: parseFloat(height),
          current_weight: parseFloat(currentWeight),
          target_weight: parseFloat(targetWeight),
          goal_mode: goal,
          number_of_meals: parseInt(mealsPerDay),
          updated_at: new Date(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      } 
      
      // Success! Notify App.js to re-check status
      console.log("Profile Updated Successfully");
      onProfileSaved();

    } catch (error) {
      Alert.alert("Save Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper component for Goal Cards
  const GoalCard = ({ title, mode }) => (
    <TouchableOpacity 
      style={[styles.goalCard, goal === mode && styles.activeGoalCard]} 
      onPress={() => setGoal(mode)}
    >
      <Text style={[styles.goalText, goal === mode && styles.activeGoalText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* BACK BUTTON */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              "Log Out",
              "Are you sure you want to log out?",
              [
                { text: "Cancel", onPress: () => {}, style: "cancel" },
                {
                  text: "Log Out",
                  onPress: () => onGoBack?.(),
                  style: "destructive"
                }
              ]
            );
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Let's calibrate.</Text>
          <Text style={styles.subtitle}>Enter your current stats to build your plan.</Text>
        </View>

        {/* FORM INPUTS */}
        <View style={styles.form}>
          
          {/* Row 1: Age & Height */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Age</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="21" 
                placeholderTextColor="#667085"
                value={age}
                onChangeText={setAge}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="175" 
                placeholderTextColor="#667085"
                value={height}
                onChangeText={setHeight}
              />
            </View>
          </View>

          {/* Row 2: Weights */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Current Weight (kg)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="70" 
                placeholderTextColor="#667085"
                value={currentWeight}
                onChangeText={setCurrentWeight}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Target Weight (kg)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="75" 
                placeholderTextColor="#667085"
                value={targetWeight}
                onChangeText={setTargetWeight}
              />
            </View>
          </View>

          {/* Section: Goal Mode */}
          <Text style={styles.sectionTitle}>What is your primary goal?</Text>
          <View style={styles.goalContainer}>
            <GoalCard title="CUT" mode="cut" />
            <GoalCard title="MAINTAIN" mode="maintain" />
            <GoalCard title="BULK" mode="bulk" />
          </View>

          {/* Section: Meal Frequency */}
          <Text style={styles.sectionTitle}>Meals per day?</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            placeholder="e.g. 3 or 4" 
            placeholderTextColor="#667085"
            value={mealsPerDay}
            onChangeText={setMealsPerDay}
          />

          {/* SAVE BUTTON */}
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE & CONTINUE</Text>
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
  scrollContent: {
    padding: 24,
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
  header: {
    marginBottom: 30,
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
  form: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    color: '#ccd6f6',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#112240',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#233554',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 10,
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalCard: {
    flex: 1,
    backgroundColor: '#112240',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#233554',
  },
  activeGoalCard: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)', // Orange tint
    borderColor: '#FF8C00',
  },
  goalText: {
    color: '#8892b0',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeGoalText: {
    color: '#FF8C00', // Orange Text
  },
  saveButton: {
    backgroundColor: '#FF8C00', // Solid Orange
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
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