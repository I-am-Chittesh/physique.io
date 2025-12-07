import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- CONFIG: Update with your laptop's IP ---
const API_BASE_URL = 'http://192.168.29.224:5000'; 

const SetupWizardScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    
    // Get User ID from Login
    const userId = route.params?.userId;

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // --- FORM STATE ---
    const [stats, setStats] = useState({
        fullName: '',
        currentWeight: '',
        targetWeight: '',
        currentMaintenance: '',
        targetMaintenance: '' // This maps to targetCalories in DB
    });

    const [workoutMode, setWorkoutMode] = useState('text'); // 'text' or 'upload'
    const [workoutText, setWorkoutText] = useState('');
    
    const [dietSettings, setDietSettings] = useState({
        mealsPerDay: '',
        generatedInputs: {} // Will hold { "Meal 1": "...", "Meal 2": "..." }
    });

    // Safety Check
    useEffect(() => {
        if (!userId) {
            // For testing dev flow without login, we might skip this
            // Alert.alert("Error", "No User ID found.");
        }
    }, [userId]);

    // ----------------------------------------------------
    // ➡️ LOGIC: GENERATE DIET INPUTS
    // ----------------------------------------------------
    const generateDietFields = () => {
        const count = parseInt(dietSettings.mealsPerDay);
        if (!count || count < 1 || count > 10) {
            Alert.alert("Invalid Input", "Please enter a number between 1 and 10.");
            return;
        }
        // Initialize empty slots
        const newInputs = {};
        for (let i = 1; i <= count; i++) {
            newInputs[`Meal ${i}`] = "";
        }
        setDietSettings({ ...dietSettings, generatedInputs: newInputs });
    };

    // ----------------------------------------------------
    // ➡️ API SUBMISSION
    // ----------------------------------------------------
    // ----------------------------------------------------
    // ➡️ REVISED SUBMISSION LOGIC (With Debugging)
    // ----------------------------------------------------
    const handleFinalSave = async () => {
        // 1. CRITICAL CHECK: Do we have the User ID?
        if (!userId) {
            Alert.alert(
                "Session Expired", 
                "Your User ID was lost during the reload. Please go back and log in again.",
                [{ text: "Go to Login", onPress: () => navigation.replace('Login') }]
            );
            return;
        }

        // 2. Validate Inputs
        if (!dietSettings.generatedInputs || Object.keys(dietSettings.generatedInputs).length === 0) {
            Alert.alert("Missing Info", "Please generate your diet plan first.");
            return;
        }

        setIsLoading(true);

        // 3. Construct the Payload
        const masterPlan = {
            userId: userId, 
            targetCalories: parseInt(stats.targetMaintenance) || 2400,
            targetProtein: parseInt(stats.targetProtein) || 100, // Make sure this state exists or default it
            dietPlan: dietSettings.generatedInputs, 
            workoutPlan: { 
                type: workoutMode, 
                details: workoutMode === 'text' ? workoutText : "File Uploaded (Placeholder)" 
            },
        };

        // Debug: Print what we are sending
        console.log("Sending Payload:", JSON.stringify(masterPlan, null, 2));

        try {
            const response = await fetch(`${API_BASE_URL}/user/setup-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(masterPlan),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert("Success!", "Your Master Plan is ready.");
                navigation.replace('Dashboard', { userId: userId }); 
            } else {
                 Alert.alert("Save Failed", data.error || "Could not save plan.");
                 console.error("Backend Error:", data);
            }

        } catch (error) {
            console.error("Setup Error:", error);
            Alert.alert("Network Error", "Check your server connection.");
        } finally {
            setIsLoading(false);
        }
    };

    // ----------------------------------------------------
    // ➡️ UI STEPS
    // ----------------------------------------------------
    
    // STEP 1: PERSONAL STATS
    const renderStep1 = () => (
        <ScrollView style={styles.scrollContainer}>
            <Text style={styles.stepTitle}>Step 1: Your Stats</Text>
            
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={stats.fullName} onChangeText={(t)=>setStats({...stats, fullName: t})} placeholder="e.g. Chittesh" placeholderTextColor="#6B7280"/>

            <View style={styles.row}>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Current Weight (kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stats.currentWeight} onChangeText={(t)=>setStats({...stats, currentWeight: t})} />
                </View>
                <View style={styles.halfInput}>
                    <Text style={styles.label}>Target Weight (kg)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={stats.targetWeight} onChangeText={(t)=>setStats({...stats, targetWeight: t})} />
                </View>
            </View>

            <Text style={styles.label}>Current Maintenance Calories</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 2200" placeholderTextColor="#6B7280" value={stats.currentMaintenance} onChangeText={(t)=>setStats({...stats, currentMaintenance: t})} />

            <Text style={styles.label}>Target Calorie Limit (For Bulking/Cutting)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 2500" placeholderTextColor="#6B7280" value={stats.targetMaintenance} onChangeText={(t)=>setStats({...stats, targetMaintenance: t})} />
        </ScrollView>
    );

    // STEP 2: WORKOUT PLAN
    const renderStep2 = () => (
        <View style={styles.scrollContainer}>
            <Text style={styles.stepTitle}>Step 2: Workout Plan</Text>
            <Text style={styles.subTitle}>How do you want to add your plan?</Text>

            <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, workoutMode === 'text' && styles.activeToggle]} onPress={() => setWorkoutMode('text')}>
                    <Text style={[styles.toggleText, workoutMode === 'text' && styles.activeToggleText]}>Type It</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, workoutMode === 'upload' && styles.activeToggle]} onPress={() => setWorkoutMode('upload')}>
                    <Text style={[styles.toggleText, workoutMode === 'upload' && styles.activeToggleText]}>Upload File</Text>
                </TouchableOpacity>
            </View>

            {workoutMode === 'text' ? (
                <View>
                    <Text style={styles.label}>Type your weekly routine:</Text>
                    <TextInput 
                        style={[styles.input, { height: 150, textAlignVertical: 'top' }]} 
                        multiline={true} 
                        placeholder="Mon: Push, Tue: Pull..." 
                        placeholderTextColor="#6B7280"
                        value={workoutText}
                        onChangeText={setWorkoutText}
                    />
                </View>
            ) : (
                <View style={styles.uploadBox}>
                    <Text style={styles.uploadText}>📂</Text>
                    <Text style={styles.uploadLabel}>Tap to select PNG, JPG, or PDF</Text>
                    <Text style={styles.infoText}>(File upload logic will be added in Day 8)</Text>
                </View>
            )}
        </View>
    );

    // STEP 3: DIET PLAN
    const renderStep3 = () => (
        <ScrollView style={styles.scrollContainer}>
            <Text style={styles.stepTitle}>Step 3: Diet Plan</Text>
            
            <View style={styles.row}>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Meals per Day?</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        placeholder="e.g. 3" 
                        placeholderTextColor="#6B7280"
                        value={dietSettings.mealsPerDay}
                        onChangeText={(t) => setDietSettings({...dietSettings, mealsPerDay: t})}
                    />
                </View>
                <TouchableOpacity style={styles.generateBtn} onPress={generateDietFields}>
                    <Text style={styles.buttonText}>Generate</Text>
                </TouchableOpacity>
            </View>

            {/* Dynamic Inputs */}
            {Object.keys(dietSettings.generatedInputs).map((key, index) => (
                <View key={index} style={styles.inputGroup}>
                    <Text style={styles.label}>{key}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={`What do you eat for ${key}?`}
                        placeholderTextColor="#6B7280"
                        value={dietSettings.generatedInputs[key]}
                        onChangeText={(text) => 
                            setDietSettings({
                                ...dietSettings, 
                                generatedInputs: { ...dietSettings.generatedInputs, [key]: text }
                            })
                        }
                    />
                </View>
            ))}
        </ScrollView>
    );

    // ----------------------------------------------------
    // ➡️ MAIN RENDER
    // ----------------------------------------------------
    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
            </View>

            {/* NAVIGATION BAR */}
            <View style={styles.buttonRow}>
                {currentStep > 1 ? (
                    <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep(currentStep - 1)}>
                        <Text style={styles.buttonText}>Back</Text>
                    </TouchableOpacity>
                ) : <View style={{width: '48%'}} />} 
                
                <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={() => {
                        if (currentStep < 3) setCurrentStep(currentStep + 1);
                        else handleFinalSave();
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? <ActivityIndicator color="#fff" /> : 
                        <Text style={styles.buttonText}>{currentStep === 3 ? "FINISH" : "NEXT"}</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E293B' },
    contentWrapper: { flex: 1, padding: 20, paddingTop: 50 },
    scrollContainer: { flex: 1 },
    
    stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#FF5733', marginBottom: 5 },
    subTitle: { fontSize: 14, color: '#A9A9A9', marginBottom: 20 },
    
    label: { color: '#F0F9FF', marginBottom: 8, fontWeight: '600', fontSize: 16 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#0F172A', fontSize: 16, marginBottom: 15 },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    halfInput: { width: '48%' },
    
    // Toggle Styles for Workout
    toggleRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#334155', borderRadius: 10, padding: 4 },
    toggleBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
    activeToggle: { backgroundColor: '#60A5FA' },
    toggleText: { color: '#A9A9A9', fontWeight: 'bold' },
    activeToggleText: { color: '#fff' },

    // Upload Box
    uploadBox: { height: 150, borderWidth: 2, borderColor: '#60A5FA', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(96, 165, 250, 0.1)' },
    uploadText: { fontSize: 40 },
    uploadLabel: { color: '#60A5FA', fontWeight: 'bold', marginTop: 10 },
    infoText: { color: '#A9A9A9', fontSize: 12, marginTop: 5 },

    // Generator Button
    generateBtn: { backgroundColor: '#60A5FA', height: 50, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10, marginBottom: 15, marginLeft: 10 },

    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155' },
    nextButton: { backgroundColor: '#FF5733', padding: 15, borderRadius: 12, alignItems: 'center', width: '48%' },
    backButton: { backgroundColor: '#475569', padding: 15, borderRadius: 12, alignItems: 'center', width: '48%' },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default SetupWizardScreen;