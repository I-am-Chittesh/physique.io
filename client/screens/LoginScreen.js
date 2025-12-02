import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// --- CONFIG: You MUST update this URL for your phone to work ---
const API_BASE_URL = 'http://192.168.29.224:5000'; // <-- CHANGE THIS IP

const LoginScreen = () => {
    const navigation = useNavigation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { width, height } = useWindowDimensions();

    // Form validation: both fields must contain non-whitespace characters
    const isFormValid = username.trim().length > 0 && password.trim().length > 0;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    // Responsive typography and spacing
    // reduce horizontal padding so layout is tighter on small screens
    const contentPadding = clamp(Math.round(width * 0.04), 8, 60);
    const titleMargin = clamp(Math.round(height * 0.04), 12, 80);
    const inputHeight = clamp(Math.round(height * 0.055), 40, 64);
    const buttonPadding = clamp(Math.round(width * 0.035), 8, 28);
    const buttonWidth = Math.min(320, Math.round(width * 0.5));
    const bottomPadding = clamp(Math.round(height * 0.045), 12, 64);

    // Semi-circle sizing (height and radius) respond to height/width
    // Make the semicircle larger and responsive: height based on a portion of screen height
    // and radius based on a portion of screen width. Reduce both by 20% per request.
    // Make the semicircle slightly smaller by 10% from the previous size
    const baseTopShapeHeight = Math.round(height * 0.48 * 0.9); // 0.48 * 0.9 = 0.432
    const reducedTopShapeHeight = Math.round(baseTopShapeHeight * 0.95);
    const topShapeHeight = clamp(reducedTopShapeHeight, 140, Math.round(height * 0.6));

    // Reduce radius by 10% from previous wide size
    const baseTopShapeRadius = Math.round(width * 0.85 * 0.9); // 0.85 * 0.9 = 0.765
    const reducedTopShapeRadius = Math.round(baseTopShapeRadius * 0.95);
    const topShapeRadius = clamp(reducedTopShapeRadius, topShapeHeight, Math.round(width * 0.9));

    // Icon sizing — proportional to width, allow large but clamp
    const iconBase = Math.round(width * 0.22);
    const iconSize = clamp(Math.round(iconBase * 2), 58, 360);
        // place the icon vertically centered inside the semicircle (no extra fixed padding)
        const iconCenteredTop = Math.round(topShapeHeight * 0.5 - iconSize * 0.5);
        const iconTopPad = Math.max(0, iconCenteredTop);
        // const iconTopPad = Math.max(0, iconCenteredTop + iconExtra + 50); // Removed duplicate declaration
    
    // --- TEMPORARY Placeholder Function for Day 4 ---
    // Function to handle automatic navigation after successful login/signup
const navigateAfterAuth = (user) => {
    // Check the 'plan_set' field returned by the backend (Day 3 logic)
    if (user.plan_set) {
        navigation.navigate('Dashboard'); // Plan exists, go straight to the app
    } else {
        navigation.navigate('Setup'); // New user/plan missing, redirect to setup wizard
    }
};

// ➡️ SIGNUP LOGIC (Used if Login fails)
const handleSignup = async () => {
    // Use the existing username and password variables
    try {
        Alert.alert("Attempting Signup", "Creating a new account...");
        let response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        let data = await response.json();

        if (response.ok) {
            Alert.alert("Account Created!", "Time to build your plan.");
            // After successful signup, user is new, so always navigate to Setup
            navigation.navigate('Setup'); 
        } else {
             Alert.alert("Signup Failed", data.details || data.error || "An unknown error occurred.");
        }
    } catch (error) {
        Alert.alert("Network Error", "Could not complete signup.");
    }
};

// ➡️ PRIMARY LOGIN ATTEMPT
const handleLogin = async () => {
    console.log('handleLogin invoked', { username, password });
    // Validation check: Use the combined logic
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
        Alert.alert("Error", "Please enter both username and password.");
        return;
    }

    setIsLoading(true);

    try {
        // First attempt: Try to log in
        let response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
        });

        let data = await response.json();

        if (response.ok) {
            // Login Success
            navigateAfterAuth(data.user);
            
        } else if (response.status === 401 || response.status === 404) {
             // If account not found (404) or credentials invalid (401), try signing up.
             handleSignup();
        } else {
            Alert.alert("Login Failed", data.error || "Could not connect to server.");
        }

    } catch (error) {
        console.error("Network Error:", error);
        Alert.alert("Network Error", "Check your IP and ensure the Node server is running.");
    } finally {
        setIsLoading(false);
    }
};
    // ----------------------------------------------------
    // ➡️ UI RENDER (The components you see)
    // ----------------------------------------------------
    return (
        <View style={styles.container}>
            {/* The reduced semicircle header */}
            <View style={[styles.topShape, { height: topShapeHeight, borderBottomLeftRadius: topShapeRadius, borderBottomRightRadius: topShapeRadius }]}>
                <Image
                    source={require('../assets/icons.png')}
                    style={[
                        styles.icon,
                        { width: iconSize, height: iconSize, position: 'absolute', top: iconTopPad, alignSelf: 'center', borderRadius: iconSize / 2 },
                    ]}
                    resizeMode="contain"
                />
            </View>

            {/* Main Centered Content Wrapper with Card */}
            <View style={[styles.contentWrapper, { padding: contentPadding, paddingBottom: bottomPadding + 24 }]}>
                <View style={[styles.card, { padding: Math.max(20, contentPadding), marginTop: Math.round(topShapeHeight * 0.6) }]}>
                    <Text style={styles.titleCard}>PHYSIQUE.IO</Text>

                    <TextInput
                        style={styles.inputCard}
                        placeholder="Username"
                        placeholderTextColor="#6B7280"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        accessibilityLabel="username"
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputCard}
                            placeholder="Password"
                            placeholderTextColor="#6B7280"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            accessibilityLabel="password"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(s => !s)}
                            style={styles.passwordToggle}
                            accessibilityRole="button"
                        >
                            <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, { width: '100%', padding: buttonPadding }]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        accessibilityRole="button"
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>GO</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- FINAL STYLING ---
const styles = StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: '#1E293B', // Dark Slate Blue
    },
    
    // The 30% Curved Top Shape
    topShape: {
        width: '100%',
        height: '30%', 
        backgroundColor: '#60A5FA', // Contrast Sky Blue
        borderBottomLeftRadius: 150, 
        borderBottomRightRadius: 150,
        position: 'absolute',
        top: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Wrapper for Inputs/Buttons to center them
    contentWrapper: {
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        zIndex: 1,
    },
    
    title: {
        fontSize: 50,
        fontWeight: 'bold',
        marginBottom: 40,
        color: '#FF5733', // Primary Orange
    },

    icon: {
        // subtle shadow and border for better contrast
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
    },
    // Card layout for modern login
    card: {
        width: '92%',
        maxWidth: 420,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 10,
    },
    titleCard: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FF5733',
        marginBottom: 14,
    },
    inputCard: {
        width: '100%',
        height: 48,
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
    },
    passwordContainer: {
        width: '100%',
        position: 'relative',
        marginBottom: 12,
    },
    passwordToggle: {
        position: 'absolute',
        right: 12,
        top: 10,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    passwordToggleText: {
        color: '#FF5733',
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: '#FF5733',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    
    // Input Styling (Light Grey BG, Black Text, Height 40, No Border)
    input: {
        width: '100%',
        height: 40, // Height 40
        borderColor: '#E0E0E0', // Light Grey Background
        borderWidth: 0, // No Border/Outline
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: '#E0E0E0', 
        color: '#000000', // Black Text Color
        fontWeight: 'bold', // Montserrat Bold
    },
    
    // Button Styling
    button: {
        backgroundColor: '#FF5733', // Primary Orange
        padding: 10, // Adjusted padding for smaller height
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    
    buttonText: {
        color: '#fff', // Bright White
        fontWeight: 'bold', // Montserrat Bold
        fontSize: 16, // Appropriate size
    }
});

export default LoginScreen;