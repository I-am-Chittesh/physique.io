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
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [confirmPassword, setConfirmPassword] = useState('');
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
    // Reduce the semicircle so it no longer overlaps the white card.
    // Use smaller proportions and slightly larger clamping floor to keep it compact.
    const baseTopShapeHeight = Math.round(height * 0.36 * 0.9); // smaller: 0.36 * 0.9 = 0.324
    const reducedTopShapeHeight = Math.round(baseTopShapeHeight * 0.92);
    const topShapeHeight = clamp(reducedTopShapeHeight, 110, Math.round(height * 0.55));

    // Reduce radius so semicircle looks tighter on narrow screens
    const baseTopShapeRadius = Math.round(width * 0.7 * 0.9); // smaller radius
    const reducedTopShapeRadius = Math.round(baseTopShapeRadius * 0.92);
    const topShapeRadius = clamp(reducedTopShapeRadius, topShapeHeight, Math.round(width * 0.85));

    // Icon sizing — proportional to width, allow large but clamp
    const iconBase = Math.round(width * 0.22);
    const iconSize = clamp(Math.round(iconBase * 2), 58, 360);
        // place the icon vertically centered inside the semicircle (no extra fixed padding)
        const iconCenteredTop = Math.round(topShapeHeight * 0.5 - iconSize * 0.5);
        const iconTopPad = Math.max(0, iconCenteredTop);
        // const iconTopPad = Math.max(0, iconCenteredTop + iconExtra + 50); // Removed duplicate declaration
    

// 1. UPDATE: Helper to navigate based on plan status
    const navigateAfterAuth = (user) => {
        if (user && user.plan_set) {
            // User has a plan -> Go to Dashboard
            navigation.replace('Dashboard');
        } else {
            // FIX: Pass the userId so SetupWizard knows who to save
            navigation.replace('Setup', { userId: user.id });
        }
    };

    // 2. UPDATE: Login handler
    const handleLogin = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            Alert.alert('Error', 'Please enter both username and password.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
            });

            const data = await response.json();
            if (response.ok) {
                // SUCCESS: Pass the full user object to the helper
                navigateAfterAuth(data.user);
            } else {
                if (response.status === 401 || response.status === 404) {
                    Alert.alert('Login Failed', 'Incorrect username or password.');
                } else {
                    Alert.alert('Login Failed', data.error || 'Could not connect to server.');
                }
            }
        } catch (err) {
            console.error('Login network error:', err);
            Alert.alert('Network Error', 'Unable to reach the server.');
        } finally {
            setIsLoading(false);
        }
    };

    // 3. UPDATE: Signup handler
    const handleSignup = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            Alert.alert('Error', 'Please enter username and password.');
            return;
        }
        if (trimmedPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
            });
            const data = await response.json();
            
            if (response.ok) {
                // FIX: Pass the new userId to Setup immediately
                navigation.replace('Setup', { userId: data.user.id });
            } else if (response.status === 409) {
                Alert.alert('Signup Failed', data.error || 'Username already exists.');
            } else {
                Alert.alert('Signup Failed', data.error || 'Could not create account.');
            }
        } catch (err) {
            console.error('Signup network error:', err);
            Alert.alert('Network Error', 'Unable to reach the server.');
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
                <View style={[styles.card, { padding: Math.max(20, contentPadding), marginTop: Math.round(topShapeHeight * 0.75) }]}>
                    <Text style={styles.titleCard}>PHYSIQUE.IO</Text>

                    {/* Mode tabs: Login / Sign Up */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
                            onPress={() => { setMode('login'); setIsLoading(false); }}
                        >
                            <Text style={[styles.tabButtonText, mode === 'login' && styles.tabButtonTextActive]}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
                            onPress={() => { setMode('signup'); setIsLoading(false); setConfirmPassword(''); }}
                        >
                            <Text style={[styles.tabButtonText, mode === 'signup' && styles.tabButtonTextActive]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

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

                    {mode === 'signup' && (
                        <TextInput
                            style={styles.inputCard}
                            placeholder="Confirm Password"
                            placeholderTextColor="#6B7280"
                            secureTextEntry={!showPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            accessibilityLabel="confirm-password"
                        />
                    )}

                    <TouchableOpacity
                        style={[styles.primaryButton, { width: '100%', padding: buttonPadding }]}
                        onPress={mode === 'login' ? handleLogin : handleSignup}
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
    ,
    tabContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 10,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: 'transparent',
    },
    tabButtonActive: {
        backgroundColor: '#FFEDD5',
    },
    tabButtonText: {
        color: '#334155',
        fontWeight: '600',
    },
    tabButtonTextActive: {
        color: '#FF5733',
    },
});

export default LoginScreen;