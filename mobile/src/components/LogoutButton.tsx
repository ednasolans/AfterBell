import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import LoadingButton from '@/components/LoadingButton';
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
    <LoadingButton
      label="Log out"
      variant="outline"
      onPress={handleLogout}
      loading={loading}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 16 },
});