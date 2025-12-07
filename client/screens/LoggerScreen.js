import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- CONFIG: UPDATE YOUR IP ---
const API_BASE_URL = 'http://192.168.29.224:5000'; 

const LoggerScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    
    // We need the User ID to save the log. 
    // In the previous step, we didn't pass it from Dashboard, but we will fix that next.
    // For now, allow a fallback or grab from params.
    const userId = route.params?.userId; 

    // STATE
    const [foods, setFoods] = useState([]); // List from DB
    const [selectedFood, setSelectedFood] = useState(null); // Which food is clicked
    const [quantity, setQuantity] = useState('');
    const [cardioMins, setCardioMins] = useState('');
    const [metPlan, setMetPlan] = useState(true); // Default to YES
    const [isLoading, setIsLoading] = useState(false);

    // 1. FETCH FOOD LIST ON LOAD
    useEffect(() => {
        const fetchFoods = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/log/foods`);
                const data = await response.json();
                setFoods(data);
            } catch (error) {
                Alert.alert("Error", "Could not load food menu. Is server running?");
            }
        };
        fetchFoods();
    }, []);

    // 2. SUBMIT LOG
    const handleSaveLog = async () => {
        if (!userId) {
            Alert.alert("Error", "User Session Lost. Go back to Login.");
            return;
        }
        
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/log/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    foodId: selectedFood?.id || null,
                    quantity: parseInt(quantity) || 0,
                    cardioMins: parseInt(cardioMins) || 0,
                    metPlan: metPlan
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert("Logged!", "Activity saved successfully.");
                navigation.goBack(); // Return to Dashboard
            } else {
                Alert.alert("Error", data.error || "Save failed");
            }
        } catch (error) {
            Alert.alert("Network Error", "Check server connection.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>LOG ACTIVITY</Text>

            {/* SECTION 1: FOOD SELECTOR */}
            <Text style={styles.label}>1. Select Food</Text>
            <View style={styles.foodGrid}>
                {foods.map((item) => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={[styles.foodChip, selectedFood?.id === item.id && styles.selectedChip]}
                        onPress={() => setSelectedFood(item)}
                    >
                        <Text style={[styles.chipText, selectedFood?.id === item.id && styles.selectedChipText]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* QUANTITY INPUT */}
            {selectedFood && (
                <View style={styles.inputGroup}>
                    <Text style={styles.subLabel}>Quantity ({selectedFood.unit_type})</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        placeholder="e.g. 2" 
                        placeholderTextColor="#6B7280"
                        value={quantity}
                        onChangeText={setQuantity}
                    />
                </View>
            )}

            <View style={styles.divider} />

            {/* SECTION 2: CARDIO */}
            <Text style={styles.label}>2. Cardio (Optional)</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.subLabel}>Duration (Minutes)</Text>
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    placeholder="e.g. 20" 
                    placeholderTextColor="#6B7280"
                    value={cardioMins}
                    onChangeText={setCardioMins}
                />
            </View>

            <View style={styles.divider} />

            {/* SECTION 3: PLAN ADHERENCE */}
            <Text style={styles.label}>3. Did you stick to the plan?</Text>
            <View style={styles.toggleRow}>
                <TouchableOpacity 
                    style={[styles.toggleBtn, metPlan && styles.activeToggle]} 
                    onPress={() => setMetPlan(true)}
                >
                    <Text style={[styles.toggleText, metPlan && styles.activeText]}>YES</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.toggleBtn, !metPlan && styles.activeToggleRed]} 
                    onPress={() => setMetPlan(false)}
                >
                    <Text style={[styles.toggleText, !metPlan && styles.activeText]}>NO</Text>
                </TouchableOpacity>
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SAVE LOG</Text>}
            </TouchableOpacity>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E293B', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#FF5733', marginBottom: 20, marginTop: 40 },
    
    label: { fontSize: 18, color: '#F0F9FF', fontWeight: 'bold', marginBottom: 10 },
    subLabel: { fontSize: 14, color: '#94A3B8', marginBottom: 5 },
    
    // Food Chips
    foodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    foodChip: { backgroundColor: '#334155', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, marginBottom: 8 },
    selectedChip: { backgroundColor: '#60A5FA' },
    chipText: { color: '#F0F9FF' },
    selectedChipText: { color: '#fff', fontWeight: 'bold' },

    input: { backgroundColor: '#F8FAFC', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#0F172A', fontSize: 16, marginBottom: 10 },
    inputGroup: { marginBottom: 10 },
    
    divider: { height: 1, backgroundColor: '#475569', marginVertical: 20 },

    // Toggle
    toggleRow: { flexDirection: 'row', marginBottom: 30 },
    toggleBtn: { flex: 1, padding: 15, backgroundColor: '#334155', alignItems: 'center', marginHorizontal: 5, borderRadius: 10 },
    activeToggle: { backgroundColor: '#10B981' }, // Green for Yes
    activeToggleRed: { backgroundColor: '#FF5733' }, // Red for No
    toggleText: { color: '#A9A9A9', fontWeight: 'bold' },
    activeText: { color: '#fff' },

    saveButton: { backgroundColor: '#FF5733', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 50 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default LoggerScreen;