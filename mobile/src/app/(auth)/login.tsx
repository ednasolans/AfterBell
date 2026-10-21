import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';

import LoadingButton from '@/components/LoadingButton';
import { authStyles as styles } from '@/features/auth/authStyles';
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
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('account_type')
        .eq('id', data.user.id)
        .single();

      if (accountError || !account) {
        // Session exists but the account type is unknown: avoid a half-logged-in user.
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

      <LoadingButton
        label="Log in"
        onPress={handleLogin}
        loading={loading}
        style={styles.submit}
      />

      <Link href="/sign-up" style={styles.link}>
        Don&apos;t have an account? Sign up
      </Link>
    </KeyboardAvoidingView>
  );
}