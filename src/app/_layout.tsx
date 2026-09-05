import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { palette } from '../lib/theme'

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const colors = palette[scheme]

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Bills' }} />
        <Stack.Screen name="bill/[id]/index" options={{ title: 'Bill' }} />
        <Stack.Screen name="bill/[id]/summary" options={{ title: 'Who owes what' }} />
      </Stack>
    </SafeAreaProvider>
  )
}
