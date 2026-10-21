import { StyleSheet } from 'react-native';

// Styles shared by the authentication screens.
export const authStyles = StyleSheet.create({
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
  submit: { marginTop: 8 },
  link: { marginTop: 16, textAlign: 'center', color: '#06c' },
});