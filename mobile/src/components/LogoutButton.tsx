import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

// Adjust the path to wherever your Supabase client lives.
import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
        return;
      }
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleLogout}
      disabled={loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color="#111" />
      ) : (
        <Text style={styles.text}>Log out</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#111',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  text: { color: '#111', fontWeight: '600', fontSize: 16 },
});
