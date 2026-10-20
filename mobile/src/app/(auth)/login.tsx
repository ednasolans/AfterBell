import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { Link, useRouter } from 'expo-router';

// Adjust the path to wherever your Supabase client lives.
import { supabase } from '@/lib/supabase';

function getFriendlyError(error: { message: string; code?: string }): string {
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    return 'Incorrect email or password.';
  }
  if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
    return 'Please confirm your email before logging in.';
  }
  return error.message;
}

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(getFriendlyError(signInError));
        return;
      }

      // Decide the destination area from the account type.
      // NOTE: if `accounts` links to auth.users through `user_id`
      // instead of `id`, change the filter to .eq('user_id', data.user.id).
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('account_type')
        .eq('id', data.user.id)
        .single();

      if (accountError || !account) {
        // Session exists but we cannot tell the account type: do not leave a half-logged-in user.
        await supabase.auth.signOut();
        setError('Could not load your account. Please try again.');
        return;
      }

      // 'company' is assumed to be the provider account type.
      router.replace(account.account_type === 'company' ? '/provider-home' : '/customer-home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Log in</Text>

      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
        onSubmitEditing={handleLogin}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log in</Text>
        )}
      </Pressable>

      <Link href="/sign-up" style={styles.link}>
        Don&apos;t have an account? Sign up
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: { borderColor: '#d00' },
  error: { color: '#d00', fontSize: 13 },
  button: {
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 16, textAlign: 'center', color: '#06c' },
});
