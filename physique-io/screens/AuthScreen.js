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
    if (!email || !password || (!isLogin && !fullName)) {
      Alert.alert("Missing Fields", "Please fill in all details.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          // If password is wrong or email doesn't exist
          Alert.alert("Login Failed", error.message);
        } else if (data.session) {
          console.log("Login Successful, Session established");
          // App.js will now automatically detect this and move to Dashboard
        }
      } else {
        // --- SIGNUP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          Alert.alert("Signup Error", error.message);
        } else if (data.user) {
          // Ensure the profile row is created
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
          });

          if (profileError) {
            console.log("Profile Sync Error:", profileError.message);
          }
          Alert.alert("Success", "Account created! Moving to Setup.");
        }
      }
    } catch (err) {
      Alert.alert("System Error", "An unexpected error occurred.");
      console.error(err);
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
    backgroundColor: '#0A192F', // Deepest Navy
  },
  semiCircle: {
    height: height * 0.38,
    width: width * 1.4, // Over-width to create the curve
    backgroundColor: '#112240', // Midnight Navy
    alignSelf: 'center',
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  brandName: {
    color: '#FF8C00', // Orange Accent
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#1d3557',
    borderRadius: 15,
    padding: 5,
    marginBottom: 30,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeToggle: {
    backgroundColor: '#0A192F',
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
    backgroundColor: '#112240',
    color: '#fff',
    padding: 18,
    borderRadius: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1d3557',
  },
  mainButton: {
    backgroundColor: '#FF8C00', // Solid Orange
    paddingVertical: 18,
    borderRadius: 15,
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