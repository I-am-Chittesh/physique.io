import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

const DashboardScreen = () => { // <--- RENAME THIS (e.g., DashboardScreen)
    return (
        <View style={styles.container}>
            <Text style={styles.title}>--- VijayKiran ---</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E293B',
    },
    title: {
        fontSize: 20,
        color: '#F0F9FF',
    }
});

export default DashboardScreen; // <--- RENAME THIS (e.g., DashboardScreen)