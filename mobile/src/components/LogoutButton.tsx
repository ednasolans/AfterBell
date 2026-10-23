import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import LoadingButton from '@/components/LoadingButton';
import { queryClient } from '@/lib/queryClient';
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
      // Drop cached data so the next user on this device never sees it.
      queryClient.clear();
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