import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Bell, Home, Search, User } from 'lucide-react-native';

import { useNotificationBadge } from '../src/hooks/useNotificationBadge';

export default function TabLayout() {
  const notificationBadge = useNotificationBadge();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        // Badge styling: matches standard iOS/Android appearance
        tabBarBadgeStyle: {
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          lineHeight: Platform.OS === 'ios' ? 18 : undefined,
          borderRadius: 9,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Search color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          // Only rendered when unreadCount > 0; shows '9+' when count exceeds 9
          tabBarBadge: notificationBadge,
          tabBarIcon: ({ color, size }) => (
            <Bell color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={1.75} />
          ),
        }}
      />
    </Tabs>
  );
}