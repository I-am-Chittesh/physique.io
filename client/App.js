import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. IMPORT ALL SCREENS
import LoginScreen from './screens/LoginScreen';
import SetupWizardScreen from './screens/SetupWizardScreen';
import DashboardScreen from './screens/DashboardScreen'; 
import LoggerScreen from './screens/LoggerScreen'; 
import ProfileScreen from './screens/ProfileScreen'; // <--- NEW IMPORT

const Stack = createNativeStackNavigator();
const INITIAL_ROUTE_NAME = 'Login'; 

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={INITIAL_ROUTE_NAME}>
        
        {/* Authentication */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        {/* Onboarding */}
        <Stack.Screen 
          name="Setup" 
          component={SetupWizardScreen} 
          options={{ title: 'Build Your Plan' }}
        />

        {/* Core App */}
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ headerLeft: () => null }} // Hide back button on Dashboard
        />

        <Stack.Screen 
          name="Logger" 
          component={LoggerScreen} 
          options={{ title: 'Log Activity' }} 
        />

        {/* 2. REGISTER THE NEW PROFILE ROUTE */}
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: 'My Stats' }} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}