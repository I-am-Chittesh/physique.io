import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { supabase } from '../supabase';

const { height, width } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

const handleAuth = async () => {
  // Validate inputs
  if (!email || !password) {
    Alert.alert("Missing Fields", "Email and password are required.");
    return;
  }

  if (!isLogin && !fullName) {
    Alert.alert("Missing Fields", "Please enter your full name.");
    return;
  }

  if (!isLogin && password.length < 6) {
    Alert.alert("Weak Password", "Password must be at least 6 characters.");
    return;
  }

  setLoading(true);

  try {
    if (isLogin) {
      // LOGIN MODE: Check email and password exist in database
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          Alert.alert(
            "Invalid Credentials", 
            "Email or password is incorrect. Please try again."
          );
        } else {
          Alert.alert("Login Error", error.message);
        }
      } else {
        // Login successful - App.js will auto-navigate to Dashboard
        Alert.alert("Success", "Welcome back!");
      }
    } else {
      // SIGNUP MODE: Create new account
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (signupError) {
        if (signupError.message.includes("already registered")) {
          Alert.alert(
            "Email Already Exists", 
            "This email is already registered. Please login or use a different email."
          );
        } else {
          Alert.alert("Signup Failed", signupError.message);
        }
      } else if (signupData.user) {
        // Create profile entry with user's full name
        const { error: profileError } = await supabase.from('profiles').insert({
          id: signupData.user.id,
          full_name: fullName,
        });

        if (profileError) {
          Alert.alert("Profile Error", profileError.message);
        } else {
          Alert.alert("Success", "Account created! Now setting up your physique.");
          // App.js will auto-navigate to SetupScreen
        }
      }
    }
  } catch (err) {
    console.error("Auth Error:", err);
    Alert.alert("Error", "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        
        {/* 1. SEMICIRCLE HEADER */}
        <View style={styles.semiCircle}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>PHYSIQUE.IO</Text>
        </View>

        {/* 2. AUTH FORM */}
        <View style={styles.formSection}>
          
          {/* TOGGLE */}
          <View style={styles.toggleWrapper}>
            <TouchableOpacity 
              style={[styles.toggleBtn, isLogin && styles.activeToggle]} 
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.activeText]}>LOGIN</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, !isLogin && styles.activeToggle]} 
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.activeText]}>SIGN UP</Text>
            </TouchableOpacity>
          </View>

          {/* INPUTS */}
          <View style={styles.inputContainer}>
            {!isLogin && (
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#667085"
                value={fullName}
                onChangeText={setFullName}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#667085"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#667085"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity 
            style={styles.mainButton} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mainButtonText}>
                {isLogin ? "ENTER DASHBOARD" : "CREATE ACCOUNT"}
              </Text>
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
  semiCircle: {
    height: height * 0.38,
    width: width * 1.4,
    backgroundColor: '#1e6fb8',
    alignSelf: 'center',
    borderBottomLeftRadius: 320,
    borderBottomRightRadius: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  logoIcon: {
    width: 208,
    height: 208,
    marginBottom: 8,
  },
  brandName: {
    color: '#FF8C00',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: -8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(29, 53, 87, 0.6)',
    borderRadius: 20,
    padding: 6,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeToggle: {
    backgroundColor: 'rgba(10, 25, 47, 0.8)',
    borderWidth: 1,
    borderColor: '#FF8C00',
  },
  toggleText: {
    color: '#667085',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#FF8C00',
  },
  inputContainer: {
    gap: 15,
  },
  input: {
    backgroundColor: 'rgba(17, 34, 64, 0.7)',
    color: '#fff',
    padding: 18,
    borderRadius: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.15)',
  },
  mainButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.5,
  },
});