import { Tabs } from 'expo-router';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1F6B45', tabBarInactiveTintColor: '#9CA3AF' }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <Search size={22} color={color} /> }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask', tabBarIcon: () => <PlusCircle size={26} color="#D4A017" />, tabBarLabel: () => null }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <Bell size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
