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
import { LinearGradient } from 'expo-linear-gradient';
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

export default function LogMealScreen({ route, onGoBack, navigation }) {
  const { mealNumber } = route.params || { mealNumber: 1 }; // Default to 1 if missing
  
  // Support both onGoBack prop and navigation.goBack
  const handleGoBack = onGoBack || (navigation?.goBack);

  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [selectedFood, setSelectedFood] = useState(null); // The food object
  const [quantity, setQuantity] = useState('');           // The user input string (grams)
  const [pieces, setPieces] = useState('');               // Number of pieces
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

  // 2. MATH LOGIC - Support both weight-based and piece-based calculation
  const calculateCalories = () => {
    if (!selectedFood) return 0;
    
    // Option 1: Calculate from pieces (if pieces entered and calories_per_piece exists)
    if (pieces && selectedFood.calories_per_piece) {
      const numPieces = parseFloat(pieces);
      if (isNaN(numPieces) || numPieces <= 0) return 0;
      return Math.round(numPieces * selectedFood.calories_per_piece);
    }
    
    // Option 2: Calculate from weight in grams (if quantity entered)
    if (quantity) {
      const grams = parseFloat(quantity);
      if (isNaN(grams) || grams <= 0) return 0;
      
      // If calories_per_piece exists, try to convert grams to pieces
      if (selectedFood.calories_per_piece && selectedFood.grams_per_piece) {
        const numPieces = grams / selectedFood.grams_per_piece;
        return Math.round(numPieces * selectedFood.calories_per_piece);
      }
      
      // Fallback to per 100g calculation
      if (selectedFood.calories_per_100g) {
        return Math.round((selectedFood.calories_per_100g * grams) / 100);
      }
    }
    
    return 0;
  };

  // 3. SAVE LOGIC
  const handleAddLog = async () => {
    const finalCals = calculateCalories();
    
    // Validate that either weight or pieces is entered
    if (finalCals === 0) {
      Alert.alert("Invalid Input", "Please enter either weight (g) or number of pieces.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No User");

      // Calculate total grams for storage
      let totalGrams = 0;
      
      if (quantity) {
        // Weight was entered directly
        totalGrams = parseFloat(quantity);
      } else if (pieces && selectedFood.grams_per_piece) {
        // Convert pieces to grams
        totalGrams = parseFloat(pieces) * selectedFood.grams_per_piece;
      }

      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_number: mealNumber,
          food_name: selectedFood.food_name,
          quantity_g: totalGrams,
          calories_consumed: finalCals,
        });

      if (error) throw error;

      // Success! Refresh dashboard
      Alert.alert("Success", "Meal logged!");
      setSelectedFood(null);
      setQuantity('');
      setPieces('');
      setSearchText('');

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
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal {mealNumber}</Text>
        <View style={{ width: 60 }} /> 
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#a8b5c9" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food..."
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={styles.bottomSheetContainer}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedFood.food_name}</Text>
              <TouchableOpacity onPress={() => setSelectedFood(null)}>
                <Ionicons name="close" size={24} color="#FF8C00" />
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
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>PIECES</Text>
                <TextInput
                  style={styles.gramInput}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor="#667085"
                  value={pieces}
                  onChangeText={setPieces}
                />
              </View>

              <View style={styles.calcWrapper}>
                <Text style={styles.inputLabel}>CALORIES</Text>
                <Text style={styles.totalCals}>{calculateCalories()}</Text>
              </View>
            </View>

            <LinearGradient
              colors={['#FF8C00', '#FF6B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddLog}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.btnText}>ADD TO LOG</Text>
                    <Text style={styles.btnArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
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
  backButtonText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  selectedCard: {
    borderColor: 'rgba(255, 140, 0, 0.3)',
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
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
    color: '#a8b5c9',
    fontSize: 12,
  },
  emptyText: {
    color: '#667085',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  // Bottom Sheet Styles
  bottomSheetContainer: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  bottomSheet: {
    backgroundColor: 'rgba(10, 22, 40, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  inputWrapper: {
    flex: 1,
  },
  calcWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
  },
  inputLabel: {
    color: '#a8b5c9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  gramInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    padding: 13,
    borderRadius: 10,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  totalCals: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  addButtonGradient: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 20,
  },
  addButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  btnArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});