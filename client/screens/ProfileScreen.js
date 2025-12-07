import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- CONFIG ---
const API_BASE_URL = 'http://192.168.29.224:5000'; // UPDATE IP!

const ProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Get User ID from params (or fallback if navigating from Dashboard)
    // NOTE: In DashboardScreen.js, we need to make sure we pass this ID!
    const userId = route.params?.userId;

    const fetchStats = async () => {
        if (!userId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/stats/${userId}`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            Alert.alert("Error", "Could not load stats.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [userId]);

    // LOGOUT LOGIC
    const handleLogout = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    // --- RENDER HELPERS ---
    const renderContributionGrid = () => {
        // Create a dummy array of 28 days (4 weeks) for visual effect
        // In a real app, you match these to actual calendar dates
        const days = Array.from({ length: 28 }, (_, i) => i);
        
        return (
            <View style={styles.gridContainer}>
                {days.map((day, index) => {
                    // Check if we have a log for "today - index"
                    // For MVP visual, we just check if index < total successful logs
                    const isGreen = stats && index < stats.streak;
                    
                    return (
                        <View 
                            key={index} 
                            style={[
                                styles.gridBox, 
                                { backgroundColor: isGreen ? '#10B981' : '#334155' }
                            ]} 
                        />
                    );
                })}
            </View>
        );
    };

    if (isLoading) {
        return <View style={styles.container}><ActivityIndicator color="#FF5733" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>YOUR PROGRESS</Text>

            {/* STREAK CARD */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>🔥 Consistency Streak</Text>
                <Text style={styles.bigNumber}>{stats?.streak || 0} Days</Text>
                <Text style={styles.subText}>Total days you hit your plan</Text>
            </View>

            {/* CONTRIBUTION GRID */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Activity Grid (Last 4 Weeks)</Text>
                {renderContributionGrid()}
                <View style={styles.legend}>
                    <View style={[styles.legendBox, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Plan Met</Text>
                    <View style={[styles.legendBox, { backgroundColor: '#334155', marginLeft: 15 }]} />
                    <Text style={styles.legendText}>Missed</Text>
                </View>
            </View>

            {/* LOGOUT BUTTON */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>LOG OUT</Text>
            </TouchableOpacity>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E293B', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#FF5733', marginTop: 40, marginBottom: 20 },
    
    card: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 20, marginBottom: 20 },
    cardTitle: { color: '#94A3B8', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    bigNumber: { color: '#F0F9FF', fontSize: 48, fontWeight: 'bold' },
    subText: { color: '#64748B', marginTop: 5 },

    // Grid Styles
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    gridBox: { width: 30, height: 30, borderRadius: 4, margin: 4 },
    
    legend: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
    legendBox: { width: 12, height: 12, borderRadius: 2, marginRight: 5 },
    legendText: { color: '#94A3B8', fontSize: 12 },

    logoutButton: { marginTop: 40, alignItems: 'center', padding: 15, backgroundColor: '#334155', borderRadius: 12 },
    logoutText: { color: '#FF5733', fontWeight: 'bold' }
});

export default ProfileScreen;