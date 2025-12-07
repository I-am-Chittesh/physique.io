import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, TouchableOpacity, RefreshControl, Animated, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// --- CONFIG ---
import { API_BASE_URL } from '../config/api.config';

const DashboardScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Get the user ID from the route params (passed from Login/Setup)
    const userId = route.params?.userId || "d644f0df-c1bd-4a17-baac-7d01aa0b61bc";

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (!userId) {
             Alert.alert("Error", "User ID is missing. Please log in again.");
             navigation.replace('Login');
             return;
        }
        
        try {
            setError(null);
            const response = await fetch(`${API_BASE_URL}/user/summary/${userId}`);
            const data = await response.json();

            if (response.ok) {
                setUserData(data);
                console.log('Dashboard data received:', JSON.stringify(data, null, 2));
            } else {
                const errorMsg = data?.message || "Could not load dashboard data.";
                setError(errorMsg);
                Alert.alert("Error", errorMsg);
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            const errorMsg = "Network error. Is the server running?";
            setError(errorMsg);
            Alert.alert("Network Error", errorMsg);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [userId, navigation]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchDashboardData(true);
    }, [fetchDashboardData]);

    useEffect(() => {
        fetchDashboardData();
    }, [userId, fetchDashboardData]);

    // --- CALCULATIONS FOR UI (Memoized) - MUST BE BEFORE CONDITIONAL RETURNS ---
    const { remainingCalories, calorieColor, adherence } = useMemo(() => {
        if (!userData) return { remainingCalories: 0, calorieColor: '#10B981', adherence: 0 };
        const remaining = userData.targets.calories - userData.actuals.calories;
        const color = remaining < 0 ? '#FF5733' : '#10B981';
        const adherenceScore = userData.actuals.calories > 0 ? (userData.actuals.calories / userData.targets.calories) * 100 : 0;
        return { remainingCalories: remaining, calorieColor: color, adherence: adherenceScore };
    }, [userData]);

    if (isLoading || !userData) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#FF5733" />
                <Text style={styles.loadingText}>Loading Your Mission...</Text>
            </View>
        );
    }

    if (error && !userData) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchDashboardData()}>
                    <Text style={styles.buttonText}>RETRY</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FF5733" />}
            showsVerticalScrollIndicator={false}
        >
            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.greeting}>Hello, {userData.username}! 👋</Text>
                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={() => navigation.replace('Login')}
                    >
                        <Text style={styles.logoutButtonText}>🚪</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
            </View>

            {/* DAILY TARGET VS ACTUAL CARD */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🎯</Text>
                    <Text style={styles.statLabel}>Goal</Text>
                    <Text style={styles.statValue}>{userData.targets.calories}</Text>
                    <Text style={styles.statUnit}>kcal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📊</Text>
                    <Text style={styles.statLabel}>Actual</Text>
                    <Text style={styles.statValue}>{userData.actuals.calories}</Text>
                    <Text style={styles.statUnit}>kcal</Text>
                </View>
            </View>

            {/* PROGRESS RINGS & REMAINING CALORIES */}
            <View style={styles.calorieCard}>
                <View style={styles.calorieLeftSection}>
                    <Text style={styles.remainingLabel}>Remaining</Text>
                    <Text style={[styles.remainingValue, { color: calorieColor }]}>
                        {remainingCalories.toFixed(0)}
                    </Text>
                    <Text style={styles.remainingUnit}>kcal</Text>
                    <Text style={[styles.adherencePercent, { color: calorieColor }]}>
                        {adherence.toFixed(0)}% consumed
                    </Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.calorieRightSection}>
                    <Text style={styles.proteinLabel}>Protein Goal</Text>
                    <View style={styles.proteinRow}>
                        <Text style={styles.proteinValue}>{userData.actuals.protein.toFixed(0)}g</Text>
                        <Text style={styles.proteinDivider}>/</Text>
                        <Text style={styles.proteinTarget}>{userData.targets.protein}g</Text>
                    </View>
                    <View style={styles.proteinBar}>
                        <View 
                            style={[
                                styles.proteinBarFill, 
                                { width: `${Math.min((userData.actuals.protein / userData.targets.protein) * 100, 100)}%` }
                            ]} 
                        />
                    </View>
                </View>
            </View>

            {/* TODAY'S MISSION (Diet and Workout) */}
            <Text style={styles.sectionTitle}>Today's Plan</Text>

            <TouchableOpacity activeOpacity={0.7} style={styles.missionCard}>
                <View style={styles.missionIconBg}>
                    <Text style={styles.missionIcon}>🥘</Text>
                </View>
                <View style={styles.missionContent}>
                    <Text style={styles.cardHeader}>Diet Mission</Text>
                    <Text style={styles.cardContent} numberOfLines={3}>
                        {userData.today_plan_diet || 'No diet plan set for today'}
                    </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={styles.missionCard}>
                <View style={styles.missionIconBg}>
                    <Text style={styles.missionIcon}>🏋️</Text>
                </View>
                <View style={styles.missionContent}>
                    <Text style={styles.cardHeader}>Workout Mission</Text>
                    <Text style={styles.cardContent} numberOfLines={3}>
                        {userData.today_plan_workout || 'Rest day - No workout planned'}
                    </Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={styles.logButton} 
                    onPress={() => navigation.navigate('Logger', { userId: userId })} // Pass the ID!
>
                    <Text style={styles.buttonIcon}>📝</Text>
                    <Text style={styles.buttonText}>Log Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.statsButton} 
                    onPress={() => navigation.navigate('Profile', { userId })}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonIcon}>📈</Text>
                    <Text style={styles.buttonText}>View Stats</Text>
                </TouchableOpacity>
            </View>
            
            {/* ADHERENCE SCORE */}
            <View style={styles.streakBox}>
                <Text style={styles.streakLabel}>Current Adherence Score</Text>
                <Text style={styles.streakValue}>{userData.streak || 0} 🔥</Text>
                <Text style={styles.streakSubtext}>Keep up the momentum!</Text>
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 16, paddingTop: 12 },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#E0E7FF', marginTop: 12, fontSize: 16, fontWeight: '500' },
    errorText: { fontSize: 18, color: '#FF5733', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
    
    header: { marginTop: 24, marginBottom: 28 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    greeting: { fontSize: 32, fontWeight: '800', color: '#F0F9FF', letterSpacing: -0.5, flex: 1 },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutButtonText: { fontSize: 20 },
    date: { fontSize: 14, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.5, marginTop: 6 },

    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statIcon: { fontSize: 28, marginBottom: 8 },
    statLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { color: '#F0F9FF', fontSize: 28, fontWeight: '900' },
    statUnit: { color: '#64748B', fontSize: 11, marginTop: 4, fontWeight: '500' },
    statDivider: { width: 1, backgroundColor: '#334155', marginHorizontal: 10 },

    calorieCard: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 24,
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    calorieLeftSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    calorieRightSection: { flex: 1, justifyContent: 'center', paddingHorizontal: 12 },
    dividerVertical: { width: 1, backgroundColor: '#334155', marginHorizontal: 12 },
    
    remainingLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    remainingValue: { fontSize: 36, fontWeight: '900', marginBottom: 4 },
    remainingUnit: { color: '#64748B', fontSize: 12, fontWeight: '500' },
    adherencePercent: { fontSize: 13, fontWeight: '700', marginTop: 8 },

    proteinLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    proteinRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
    proteinValue: { color: '#10B981', fontSize: 24, fontWeight: '900' },
    proteinDivider: { color: '#475569', fontSize: 18, marginHorizontal: 6 },
    proteinTarget: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
    proteinBar: { 
        height: 6, 
        backgroundColor: '#334155', 
        borderRadius: 3, 
        overflow: 'hidden',
        marginTop: 4,
    },
    proteinBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

    sectionTitle: { fontSize: 18, color: '#E0E7FF', marginBottom: 16, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },

    missionCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5733',
    },
    missionIconBg: { 
        width: 50, 
        height: 50, 
        borderRadius: 12, 
        backgroundColor: '#0F172A', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 14,
    },
    missionIcon: { fontSize: 24 },
    missionContent: { flex: 1 },
    cardHeader: { fontSize: 16, fontWeight: '700', color: '#F0F9FF', marginBottom: 4 },
    cardContent: { fontSize: 13, color: '#CBD5E1', lineHeight: 18 },
    arrowIcon: { fontSize: 24, color: '#FF5733', fontWeight: '300' },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, gap: 12 },
    logButton: {
        backgroundColor: '#FF5733',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        flex: 1,
        shadowColor: '#FF5733',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statsButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        flex: 1,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: { fontSize: 20, marginBottom: 6 },
    buttonText: { color: '#FFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
    retryButton: {
        backgroundColor: '#FF5733',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 12,
    },
    
    streakBox: { 
        padding: 24, 
        backgroundColor: '#1E293B', 
        borderRadius: 16, 
        alignItems: 'center', 
        marginBottom: 40,
        borderTopWidth: 2,
        borderTopColor: '#FF5733',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    streakLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    streakValue: { fontSize: 36, fontWeight: '900', color: '#FF5733', marginBottom: 6 },
    streakSubtext: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' }
});

export default DashboardScreen;