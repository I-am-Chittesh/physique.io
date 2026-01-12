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
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
// Add '/legacy' to the end to use the old stable methods
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';    // <--- NEW
import { supabase } from '../supabase';

export default function SetupScreen({ onProfileSaved, onGoBack }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Input States
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('3'); // Default 3 meals
  const [profileImage, setProfileImage] = useState(null);
  
  // Goal Selection (bulk, cut, maintain)
  const [goal, setGoal] = useState('maintain');

  const pickAndUploadImage = async () => {
    try {
      // Request permissions before opening image picker
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photo library to upload a profile picture.');
        return;
      }

      // 1. Pick the Image
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploading(true);
        const imgUri = result.assets[0].uri;
        setProfileImage(imgUri); // Show preview immediately

        // 2. Read the file as Base64
        // CORRECT WAY:
const base64 = await FileSystem.readAsStringAsync(imgUri, {
  encoding: 'base64', // <--- Lowercase string, no 'FileSystem.EncodingType'
});

        // 3. Generate a clean file path
        const fileExt = imgUri.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        // Determine correct content type
        const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

        // 4. Upload the decoded Base64 data to Supabase
        const { data, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: contentType,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // 5. Get Public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        console.log('📸 Public URL generated:', publicUrl);
        
        // 6. Save URL to User Profile immediately after upload
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Current user:', user?.id);
        
        if (user) {
          console.log('💾 Saving image URL to profile...');
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ profile_image_url: publicUrl })
            .eq('id', user.id);

          console.log('✅ Update response:', { data: updateData, error: updateError });
          
          if (updateError) {
            console.error('❌ Profile update error:', updateError);
            throw updateError;
          }
          
          // Update state after successful database update
          setProfileImage(publicUrl);
          Alert.alert('Success', 'Profile picture uploaded successfully!');
        } else {
          throw new Error('No authenticated user found');
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert('Upload Failed', 'Upload failed: ' + (error.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

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
      console.log("🔐 User ID:", user?.id);
      if (!user) throw new Error("No user found");

      // 3. Update Profile in Supabase (image URL already saved via pickAndUploadImage)
      const updateData = {
        id: user.id,
        age: parseInt(age),
        height: parseFloat(height),
        current_weight: parseFloat(currentWeight),
        target_weight: parseFloat(targetWeight),
        goal_mode: goal,
        number_of_meals: parseInt(mealsPerDay),
        updated_at: new Date(),
      };

      // Only include profile_image_url if it's a public URL (from successful upload)
      // Don't include local file URIs
      if (profileImage && profileImage.startsWith('http')) {
        updateData.profile_image_url = profileImage;
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(updateData);

      console.log("📤 Update response - Data:", data, "Error:", error);
      console.log("📸 Saving profile_image_url:", profileImage);

      if (error) {
        throw error;
      } 
      
      // Success! Notify App.js to re-check status
      console.log("✅ Profile Updated Successfully");
      Alert.alert("Success", "Profile saved! Loading next screen...");
      
      // Small delay to ensure data is persisted
      setTimeout(() => {
        console.log("📱 Calling onProfileSaved callback");
        onProfileSaved?.();
      }, 500);

    } catch (error) {
      console.error("❌ Save Error:", error);
      Alert.alert("Save Error", error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  // Helper component for Goal Cards
  const GoalCard = ({ title, mode }) => (
    <LinearGradient
      colors={
        goal === mode
          ? ['rgba(255, 140, 0, 0.25)', 'rgba(255, 140, 0, 0.08)']
          : ['rgba(255, 140, 0, 0.04)', 'rgba(255, 140, 0, 0.01)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.goalCardGradient}
    >
      <TouchableOpacity 
        style={[styles.goalCard, goal === mode && styles.activeGoalCard]} 
        onPress={() => setGoal(mode)}
      >
        <Text style={[styles.goalText, goal === mode && styles.activeGoalText]}>
          {title}
        </Text>
        {goal === mode && <Text style={styles.goalCheckmark}>✓</Text>}
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
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
                  onPress: async () => {
                    try {
                      await supabase.auth.signOut();
                      onGoBack?.();
                    } catch (error) {
                      Alert.alert("Logout Error", error.message);
                    }
                  },
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
          
          {/* Profile Image Section */}
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={styles.imagePickerBtn} 
              onPress={pickAndUploadImage}
              disabled={uploading}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImagePreview} />
              ) : (
                <>
                  <Text style={styles.imagePickerText}>📸 Add Profile Photo</Text>
                  <Text style={styles.imagePickerSubtext}>Tap to select your image</Text>
                </>
              )}
              {uploading && <ActivityIndicator color="#FF8C00" style={{ position: 'absolute' }} />}
            </TouchableOpacity>
            {profileImage && !uploading && (
              <TouchableOpacity 
                style={styles.changeImageBtn} 
                onPress={pickAndUploadImage}
              >
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Row 1: Age & Height */}
          <View style={styles.row}>
            <LinearGradient
              colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.halfInput, styles.inputGradient]}
            >
              <View style={styles.inputWrapper}>
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
            </LinearGradient>
            <LinearGradient
              colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.halfInput, styles.inputGradient]}
            >
              <View style={styles.inputWrapper}>
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
            </LinearGradient>
          </View>

          {/* Row 2: Weights */}
          <View style={styles.row}>
            <LinearGradient
              colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.halfInput, styles.inputGradient]}
            >
              <View style={styles.inputWrapper}>
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
            </LinearGradient>
            <LinearGradient
              colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.halfInput, styles.inputGradient]}
            >
              <View style={styles.inputWrapper}>
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
            </LinearGradient>
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
          <LinearGradient
            colors={['rgba(255, 140, 0, 0.08)', 'rgba(255, 140, 0, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inputGradient}
          >
            <View style={styles.inputWrapper}>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                placeholder="e.g. 3 or 4" 
                placeholderTextColor="#667085"
                value={mealsPerDay}
                onChangeText={setMealsPerDay}
              />
            </View>
          </LinearGradient>

          {/* SAVE BUTTON */}
          <LinearGradient
            colors={['#FF8C00', '#FF6B00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>SAVE & CONTINUE</Text>
                  <Text style={styles.saveButtonArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8b5c9',
    fontWeight: '500',
    lineHeight: 24,
  },
  form: {
    gap: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  halfInput: {
    flex: 1,
  },
  inputGradient: {
    borderRadius: 14,
    padding: 0,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  label: {
    color: '#ccd6f6',
    marginBottom: 6,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  input: {
    color: '#fff',
    padding: 9,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginTop: 6,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalCardGradient: {
    borderRadius: 14,
    padding: 0,
    flex: 1,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 72,
  },
  activeGoalCard: {
    backgroundColor: 'rgba(255, 140, 0, 0.12)',
    borderColor: 'rgba(255, 140, 0, 0.4)',
  },
  goalText: {
    color: '#8892b0',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  activeGoalText: {
    color: '#FF8C00',
  },
  goalCheckmark: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  saveButtonGradient: {
    borderRadius: 14,
    marginTop: 20,
    overflow: 'hidden',
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  saveButtonArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  imageSection: {
    gap: 12,
  },
  imagePickerBtn: {
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  profileImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePickerText: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  imagePickerSubtext: {
    color: '#a8b5c9',
    fontSize: 13,
    fontWeight: '500',
  },
  changeImageBtn: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.3)',
    alignItems: 'center',
  },
  changeImageText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
  },
});