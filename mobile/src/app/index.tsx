import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import LoadingButton from '@/components/LoadingButton';
import { authStyles } from '@/features/auth/authStyles';

// Cover screen: the entry point for users without a session.
// Signed-in users never see it: AuthGate sends them to their own area.
export default function Index() {
  const router = useRouter();

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.title}>AfterBell</Text>
      <Text style={styles.tagline}>Mobile application</Text>

      <LoadingButton label="Log in" onPress={() => router.push('/login')} />
      <LoadingButton
        label="Sign up"
        variant="outline"
        onPress={() => router.push('/sign-up')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: { marginBottom: 16, color: '#555' },
});