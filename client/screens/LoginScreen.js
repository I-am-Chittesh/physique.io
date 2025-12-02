import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// --- CONFIG: You MUST update this URL for your phone to work ---
const API_BASE_URL = 'http.//192.168.29.224:5000'; // <-- CHANGE THIS IP

const LoginScreen = () => {
    const navigation = useNavigation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { width, height } = useWindowDimensions();

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
    const baseTopShapeHeight = Math.round(height * 0.38);
    const reducedTopShapeHeight = Math.round(baseTopShapeHeight * 0.8); // reduce by 20%
    const topShapeHeight = clamp(reducedTopShapeHeight, 140, Math.round(height * 0.6));

    const baseTopShapeRadius = Math.round(width * 0.6);
    const reducedTopShapeRadius = Math.round(baseTopShapeRadius * 0.8); // reduce by 20%
    const topShapeRadius = clamp(reducedTopShapeRadius, topShapeHeight, Math.round(width * 0.9));

    // Icon sizing — proportional to width, allow large but clamp
    const iconBase = Math.round(width * 0.22);
    const iconSize = clamp(Math.round(iconBase * 2), 58, 360);
        // place the icon vertically centered inside the semicircle (no extra fixed padding)
        const iconCenteredTop = Math.round(topShapeHeight * 0.5 - iconSize * 0.5);
        const iconTopPad = Math.max(0, iconCenteredTop);
        // const iconTopPad = Math.max(0, iconCenteredTop + iconExtra + 50); // Removed duplicate declaration
    
    // --- TEMPORARY Placeholder Function for Day 4 ---
    const handleLogin = () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            Alert.alert('Error', 'Please enter both username and password.');
            return;
        }
        // In the final app, API logic replaces this line:
        navigation.replace('Setup'); 
    };

    // Form validation: both fields must contain non-whitespace characters
    const isFormValid = username.trim().length > 0 && password.trim().length > 0;

    // ----------------------------------------------------
    // ➡️ UI RENDER (The components you see)
    // ----------------------------------------------------
    return (
        <View style={styles.container}>
            
            {/* The 30% Contrast Blue Semi-Circle Shape */}
            <View style={[styles.topShape, { height: topShapeHeight, borderBottomLeftRadius: topShapeRadius, borderBottomRightRadius: topShapeRadius }]}>
                {/* Icon inside the semi-circle. Place a file named `icons.png` in `client/assets/` */}
                <Image
                    source={require('../assets/icons.png')}
                    style={[
                        styles.icon,
                        { width: iconSize, height: iconSize, position: 'absolute', top: iconTopPad, alignSelf: 'center', borderRadius: iconSize / 2 },
                    ]}
                    resizeMode="contain"
                />
            </View>
            
            {/* Main Centered Content Wrapper */}
            <View style={[styles.contentWrapper, { padding: contentPadding, paddingBottom: bottomPadding + 24 }]}>
                
                {/* 1. TITLE: Primary Orange, Bold, Fixed Size 50 */}
                <Text style={[styles.title, { fontSize: 50, marginBottom: titleMargin }]}>Physique.io</Text>
                
                {/* 2. USERNAME INPUT */}
                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#A9A9A9"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                
                {/* 3. PASSWORD INPUT */}
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#A9A9A9"
                    secureTextEntry={true} 
                    value={password}
                    onChangeText={setPassword}
                />
                
                {/* 4. ACTION BUTTON is moved to bottom for better UX on small screens */}
            </View>
            {/* Bottom fixed small button */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomPadding, alignItems: 'center' }}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        { width: buttonWidth, padding: buttonPadding, borderRadius: Math.round(buttonWidth / 2) },
                        // make disabled state visually obvious
                        (!isFormValid || isLoading) && { opacity: 0.6 },
                    ]}
                    onPress={handleLogin}
                    disabled={!isFormValid || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>GO</Text>
                    )}
                </TouchableOpacity>
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