import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import './i18n';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AdviceScreen from './src/screens/AdviceScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import MarketScreen from './src/screens/MarketScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
    const { t } = useTranslation();
    
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    switch (route.name) {
                        case 'Dashboard': iconName = 'dashboard'; break;
                        case 'Advice': iconName = 'lightbulb'; break;
                        case 'Community': iconName = 'forum'; break;
                        case 'Market': iconName = 'attach-money'; break;
                        case 'Analytics': iconName = 'show-chart'; break;
                        default: iconName = 'home';
                    }
                    return <Icon name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboard') }} />
            <Tab.Screen name="Advice" component={AdviceScreen} options={{ title: t('advice') }} />
            <Tab.Screen name="Community" component={CommunityScreen} options={{ title: t('community') }} />
            <Tab.Screen name="Market" component={MarketScreen} options={{ title: t('market') }} />
            <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: t('analytics') }} />
        </Tab.Navigator>
    );
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        const savedToken = await AsyncStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            setIsLoggedIn(true);
        }
    };

    return (
        <PaperProvider>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!isLoggedIn ? (
                        <Stack.Screen name="Login">
                            {props => <LoginScreen {...props} setToken={setToken} setIsLoggedIn={setIsLoggedIn} />}
                        </Stack.Screen>
                    ) : (
                        <>
                            <Stack.Screen name="Main" component={MainTabs} />
                            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true }} />
                        </>
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </PaperProvider>
    );
}

export default App;