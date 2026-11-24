import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import ChevronDown from '@/assets/icons/book-service/chevron-down.svg';
import Globe from '@/assets/icons/book-service/globe.svg';
import Mic from '@/assets/icons/book-service/mic.svg';
import AppText from '@/components/AppText';
import LinkButton from '@/components/LinkButton';
import { strings } from '@/constants/strings';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { bookingService } from '@/services/bookingService';
import { CONCERN_MAX_LENGTH, CONCERN_MIN_LENGTH } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { useRevealOnFocus } from './BookingLayout';
import LanguageSheet from './LanguageSheet';
import SectionHeading from './SectionHeading';

const t = strings.bookService.service;
const LANGUAGES = bookingService.voiceLanguages();
const EXAMPLES = bookingService.concernExamples();

type Props = {
  value: string;
  onChange: (text: string) => void;
  /** "Talk to Technician" is on: the text is optional (no length hint). */
  optional: boolean;
};

/**
 * "Raise Your Concern" panel: title + subtitle with a "Speak" button, the voice card from step2.svg (mic in
 * violet halos, "Tap to start speaking", the language pill; UI only via the useVoiceInput stub), a
 * 500-character textarea with a live counter, and the example prompts as a collapsible hint.
 */
export default function ConcernPanel({ value, onChange, optional }: Props) {
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const voice = useVoiceInput(LANGUAGES[0].code);
  const reveal = useRevealOnFocus();
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const listening = voice.status === 'listening';
  const language = LANGUAGES.find(l => l.code === voice.language) ?? LANGUAGES[0];
  const tooShort = !optional && value.trim().length > 0 && value.trim().length < CONCERN_MIN_LENGTH;

  return (
    <View testID="concern-panel">
      <SectionHeading
        title={t.concernTitle}
        subtitle={t.concernSubtitle}
        right={
          <Pressable
            testID="concern-speak"
            onPress={() => {
              if (voiceOpen) {
                voice.stop();
              }
              setVoiceOpen(o => !o);
            }}
            accessibilityRole="button"
            accessibilityLabel={voiceOpen ? t.hideVoice : t.speak}
            accessibilityState={{ expanded: voiceOpen }}
            style={({ pressed }) => [styles.pill, styles.speak, pressed && styles.pressed]}
          >
            <Mic width={18} height={18} color={colors.booking.link} />
            <AppText variant="linkSmall" color="booking.link" style={styles.pillLabel}>
              {t.speak}
            </AppText>
          </Pressable>
        }
      />

      {voiceOpen && (
        <View testID="voice-card" style={styles.voiceCard}>
          <Pressable
            testID="voice-mic"
            onPress={listening ? voice.stop : voice.start}
            accessibilityRole="button"
            accessibilityLabel={listening ? t.micStopA11y : t.micA11y}
            accessibilityState={{ busy: listening }}
            hitSlop={8}
            style={styles.haloOuter}
          >
            <View style={[styles.haloInner, listening && styles.haloListening]}>
              <View style={styles.mic}>
                <Mic width={24} height={24} color={colors.booking.micIcon} />
              </View>
            </View>
          </Pressable>
          <AppText variant="smallStrong" color="booking.stepLabel" style={styles.voiceText}>
            {listening ? t.listening : t.tapToSpeak}
          </AppText>
          {listening && !voice.supported && (
            <AppText testID="voice-unavailable" variant="meta" color="booking.subtitle" style={styles.voiceNote}>
              {t.voiceUnavailable}
            </AppText>
          )}
          <Pressable
            testID="voice-language"
            onPress={() => setLanguageOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.languageA11y(language.label)}
            style={({ pressed }) => [styles.pill, styles.language, pressed && styles.pressed]}
          >
            <Globe width={20} height={20} color={colors.booking.languageIcon} />
            <AppText variant="linkSmall" color="booking.link" style={styles.pillLabel}>
              {language.label}
            </AppText>
            <ChevronDown width={16} height={16} color={colors.booking.languageIcon} style={styles.chevron} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputBox, focused && styles.inputFocused, tooShort && styles.inputError]}>
        <TextInput
          ref={inputRef}
          testID="concern-input"
          value={value}
          onChangeText={onChange}
          multiline
          maxLength={CONCERN_MAX_LENGTH}
          placeholder={t.concernPlaceholder}
          placeholderTextColor={colors.booking.muted}
          accessibilityLabel={t.concernA11y}
          accessibilityHint={tooShort ? t.concernTooShort(CONCERN_MIN_LENGTH) : undefined}
          textAlignVertical="top"
          selectionColor={colors.primary.main}
          cursorColor={colors.primary.main}
          onFocus={() => {
            setFocused(true);
            reveal(inputRef.current);
          }}
          onBlur={() => setFocused(false)}
          style={[styles.input, typography.variants.inputSmall, { color: colors.booking.text }]}
        />
        <AppText testID="concern-counter" variant="meta" color="booking.muted" style={styles.counter}>
          {t.counter(value.length, CONCERN_MAX_LENGTH)}
        </AppText>
      </View>
      {tooShort && (
        <AppText testID="concern-error" variant="error" color="status.errorOnLight" style={styles.helper}>
          {t.concernTooShort(CONCERN_MIN_LENGTH)}
        </AppText>
      )}
      {optional && (
        <AppText testID="concern-optional" variant="meta" color="booking.subtitle" style={styles.helper}>
          {t.concernOptional}
        </AppText>
      )}

      <LinkButton
        testID="concern-examples-toggle"
        label={examplesOpen ? t.examplesHide : t.examplesShow}
        onPress={() => setExamplesOpen(o => !o)}
        variant="linkSmall"
        style={styles.examplesToggle}
      />
      {examplesOpen && (
        <View testID="concern-examples" style={styles.examples}>
          {EXAMPLES.map(line => (
            <View key={line} style={styles.bullet}>
              <AppText variant="meta" color="booking.text" style={styles.dot}>
                •
              </AppText>
              <AppText variant="meta" color="booking.text" style={styles.bulletText}>
                {line}
              </AppText>
            </View>
          ))}
        </View>
      )}

      <LanguageSheet
        visible={languageOpen}
        languages={LANGUAGES}
        value={voice.language}
        onSelect={voice.setLanguage}
        onClose={() => setLanguageOpen(false)}
      />
    </View>
  );
}

/* step2.svg: voice card 322×145 r8 (violet 16%), mic 32 in 40 / 48 halos, text 12pt under, language pill
 * 112×32 r16 (violet 30% border); example box mist50 r8; counter bottom-right. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 32,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.booking.languageBorder,
      backgroundColor: colors.booking.card,
    },
    speak: { marginLeft: 12 },
    pillLabel: { marginLeft: 6 },
    pressed: { opacity: 0.8 },
    voiceCard: {
      marginTop: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.voiceCardBorder,
      backgroundColor: colors.booking.voiceCard,
      alignItems: 'center',
    },
    haloOuter: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.booking.micHaloOuter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    haloInner: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.booking.micHaloInner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    haloListening: { transform: [{ scale: 1.15 }] },
    mic: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.booking.mic,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voiceText: { marginTop: 8 },
    voiceNote: { marginTop: 4, marginHorizontal: 16, textAlign: 'center' },
    language: { marginTop: 16 },
    chevron: { marginLeft: 8 },
    inputBox: {
      marginTop: 16,
      minHeight: 160,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.insetBorder,
      backgroundColor: colors.booking.inset,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    inputFocused: { borderColor: colors.booking.insetBorderFocused },
    inputError: { borderColor: colors.status.errorOnLight },
    input: { flex: 1, minHeight: 110, padding: 0 },
    counter: { alignSelf: 'flex-end', marginTop: 6 },
    helper: { marginTop: 6 },
    examplesToggle: { alignSelf: 'flex-start', marginTop: 4 },
    examples: {
      padding: 16,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.insetBorder,
      backgroundColor: colors.booking.inset,
      gap: 6,
    },
    bullet: { flexDirection: 'row' },
    dot: { width: 14 },
    bulletText: { flex: 1 },
  });
