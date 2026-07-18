import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'create-account';

const ACCENT = '#3c87f7';

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);

  const inputBackground = theme.backgroundElement;

  function validate(): string | null {
    if (!email.trim() || !isValidEmail(email.trim())) return 'Enter a valid email address.';
    if (!password) return 'Enter your password.';
    if (mode === 'create-account') {
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (!firstName.trim() || !lastName.trim()) return 'Enter your first and last name.';
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    const result =
      mode === 'sign-in'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, firstName.trim(), lastName.trim());

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'create-account') {
      setConfirmationPending(true);
    }
  }

  function switchToSignIn() {
    setMode('sign-in');
    setError(null);
    setConfirmationPending(false);
    setPassword('');
  }

  if (confirmationPending) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.content, { paddingTop: insets.top + Spacing.six }]}>
          <ThemedText type="subtitle" style={styles.centerText}>
            Check your email
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            We sent a confirmation link to {email.trim()}. Confirm your account, then sign in
            below.
          </ThemedText>
          <Pressable
            onPress={switchToSignIn}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: ACCENT },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.buttonText}>Back to sign in</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.six },
        ]}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={[styles.centerText, styles.headline]}>
            {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
          </ThemedText>

          {mode === 'create-account' && (
            <ThemedView style={styles.row}>
              <TextInput
                style={[
                  styles.input,
                  styles.rowInput,
                  { backgroundColor: inputBackground, color: theme.text },
                ]}
                placeholder="First name"
                placeholderTextColor={theme.textSecondary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.rowInput,
                  { backgroundColor: inputBackground, color: theme.text },
                ]}
                placeholder="Last name"
                placeholderTextColor={theme.textSecondary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </ThemedView>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, color: theme.text }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
          />

          {error && (
            <ThemedText style={styles.errorText} themeColor="text">
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: ACCENT },
              (pressed || submitting) && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'sign-in' ? 'create-account' : 'sign-in');
              setError(null);
            }}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="link" style={styles.centerText}>
              {mode === 'sign-in'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  headline: {
    marginBottom: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowInput: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: '#e0453c',
  },
});
