import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';

// Debounce helper to prevent database spam while typing
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

export default function LogMealScreen({ route, navigation }) {
  const { mealNumber } = route.params || { mealNumber: 1 }; // Default to 1 if missing

  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [selectedFood, setSelectedFood] = useState(null); // The food object
  const [quantity, setQuantity] = useState('');           // The user input string
  const [submitting, setSubmitting] = useState(false);

  // 1. SEARCH LOGIC (Debounced)
  const performSearch = async (query) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_library')
        .select('*')
        .ilike('food_name', `%${query}%`) // Case-insensitive partial match
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.log('Search Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create the debounced function once
  const debouncedSearch = useCallback(debounce(performSearch, 400), []);

  const handleTextChange = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  // 2. MATH LOGIC
  const calculateCalories = () => {
    if (!selectedFood || !quantity) return 0;
    const grams = parseFloat(quantity);
    if (isNaN(grams)) return 0;
    
    // (Cal per 100g * grams) / 100
    return Math.round((selectedFood.calories_per_100g * grams) / 100);
  };

  // 3. SAVE LOGIC
  const handleAddLog = async () => {
    const finalCals = calculateCalories();
    
    if (finalCals === 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid weight in grams.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No User");

      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_number: mealNumber,
          food_name: selectedFood.food_name,
          quantity_g: parseFloat(quantity),
          calories_consumed: finalCals,
        });

      if (error) throw error;

      // Success! Go back to Dashboard
      navigation.goBack();

    } catch (error) {
      Alert.alert("Save Error", error.message);
      setSubmitting(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.resultCard, 
        selectedFood?.id === item.id && styles.selectedCard
      ]}
      onPress={() => {
        setSelectedFood(item);
        setQuantity(''); // Reset quantity on new selection
        Keyboard.dismiss();
      }}
    >
      <View>
        <Text style={[styles.foodName, selectedFood?.id === item.id && styles.selectedText]}>
          {item.food_name}
        </Text>
        <Text style={styles.foodMacro}>
          {item.calories_per_100g} kcal / 100g
        </Text>
      </View>
      
      {selectedFood?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#FF8C00" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal {mealNumber}</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8892b0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food (e.g., Oats, Chicken)"
          placeholderTextColor="#667085"
          value={searchText}
          onChangeText={handleTextChange}
          autoFocus={true}
        />
        {loading && <ActivityIndicator size="small" color="#FF8C00" style={{ marginRight: 10 }}/>}
      </View>

      {/* RESULTS LIST */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && searchText.length > 2 ? (
            <Text style={styles.emptyText}>No food found. Try a different name.</Text>
          ) : null
        }
      />

      {/* QUANTITY INPUT OVERLAY (Only shows when food selected) */}
      {selectedFood && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.bottomSheet}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{selectedFood.food_name}</Text>
            <TouchableOpacity onPress={() => setSelectedFood(null)}>
              <Ionicons name="close" size={24} color="#667085" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>WEIGHT (g)</Text>
              <TextInput
                style={styles.gramInput}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#667085"
                value={quantity}
                onChangeText={setQuantity}
                autoFocus={true} // Focuses on grams immediately after selection
              />
            </View>

            <View style={styles.calcWrapper}>
              <Text style={styles.inputLabel}>TOTAL CALORIES</Text>
              <Text style={styles.totalCals}>{calculateCalories()}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddLog}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>ADD TO LOG</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginLeft: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    padding: 20,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#112240',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#233554',
  },
  selectedCard: {
    borderColor: '#FF8C00',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
  },
  foodName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedText: {
    color: '#FF8C00',
  },
  foodMacro: {
    color: '#8892b0',
    fontSize: 12,
  },
  emptyText: {
    color: '#667085',
    textAlign: 'center',
    marginTop: 30,
  },
  // Bottom Sheet Styles
  bottomSheet: {
    backgroundColor: '#112240',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#FF8C00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 25,
  },
  inputWrapper: {
    flex: 1,
  },
  calcWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233554',
  },
  inputLabel: {
    color: '#8892b0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gramInput: {
    backgroundColor: '#0A192F',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 15,
    borderRadius: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#233554',
  },
  totalCals: {
    color: '#FF8C00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});