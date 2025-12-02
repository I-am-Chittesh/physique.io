import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// These imports link to the files you created in the 'screens' folder
import LoginScreen from './screens/LoginScreen';
import SetupWizardScreen from './screens/SetupWizardScreen';
import DashboardScreen from './screens/DashboardScreen'; 

const Stack = createNativeStackNavigator();
const INITIAL_ROUTE_NAME = 'Login'; 

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={INITIAL_ROUTE_NAME}>
        
        {/* The first screen the user sees */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        {/* The Setup Wizard (Our Onboarding) */}
        <Stack.Screen 
          name="Setup" 
          component={SetupWizardScreen} 
          options={{ title: 'Build Your Plan' }}
        />

        {/* The Main App View */}
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}