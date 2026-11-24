import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useBookingServices } from '@/hooks/api/useBookService';
import type { BookServiceStackScreenProps } from '@/navigation/types';
import { canContinueService, useBookingStore, type ServiceMode } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import BookingLayout from './components/BookingLayout';
import ConcernPanel from './components/ConcernPanel';
import SectionHeading from './components/SectionHeading';
import SelectableCard from './components/SelectableCard';
import SelectionIndicator from './components/SelectionIndicator';
import ServiceRow from './components/ServiceRow';

const t = strings.bookService.service;

const MODES: { mode: ServiceMode; title: string; subtitle: string }[] = [
  { mode: 'concern', title: t.concernCard, subtitle: t.concernCardSubtitle },
  { mode: 'custom', title: t.customCard, subtitle: t.customCardSubtitle },
];

/**
 * Step 2 – Choose Service (step2.svg, changed per the brief): a "Talk to Technician" radio-toggle on top,
 * then two option cards, "Raise Your Concern" and "Custom Services" ("Service Packages" is removed), and
 * the chosen panel. Next: Talk to Technician on, or ≥ 1 custom service, or a concern of ≥ 10 characters.
 */
export default function ChooseServiceScreen({ navigation }: BookServiceStackScreenProps<'BookServices'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const serviceMode = useBookingStore(s => s.serviceMode);
  const concern = useBookingStore(s => s.concern);
  const talkToTechnician = useBookingStore(s => s.talkToTechnician);
  const services = useBookingStore(s => s.services);
  const { setServiceMode, setConcern, toggleTalkToTechnician, toggleService } = useBookingStore.getState();
  const list = useBookingServices();
  const canContinue = canContinueService({ serviceMode, concern, talkToTechnician, services });

  return (
    <BookingLayout
      testID="book-services"
      step={2}
      onBack={() => navigation.goBack()}
      onPrimary={() => navigation.navigate('BookCentre')}
      primaryDisabled={!canContinue}
    >
      <SectionHeading title={t.title} subtitle={t.subtitle} />

      <SelectableCard
        testID="talk-to-technician"
        role="radio"
        selected={talkToTechnician}
        onPress={toggleTalkToTechnician}
        accessibilityLabel={t.talkToTechnician}
        style={styles.technician}
      >
        <SelectionIndicator kind="radio" selected={talkToTechnician} testID="talk-to-technician-radio" />
        <AppText variant="rowTitle" color="booking.title" style={styles.technicianLabel}>
          {t.talkToTechnician}
        </AppText>
      </SelectableCard>

      <View style={styles.modes} accessibilityRole="radiogroup" accessibilityLabel={t.modeA11y}>
        {MODES.map(m => {
          const selected = serviceMode === m.mode;
          return (
            <SelectableCard
              key={m.mode}
              testID={`service-mode-${m.mode}`}
              role="radio"
              selected={selected}
              onPress={() => setServiceMode(m.mode)}
              accessibilityLabel={`${m.title}, ${m.subtitle}`}
              style={styles.mode}
            >
              <SelectionIndicator kind="radio" selected={selected} />
              <AppText variant="rowTitle" color="booking.title" style={styles.modeTitle}>
                {m.title}
              </AppText>
              <AppText variant="rowSubtitle" color="booking.meta" style={styles.modeSubtitle}>
                {m.subtitle}
              </AppText>
            </SelectableCard>
          );
        })}
      </View>

      <View style={styles.panel}>
        {serviceMode === 'concern' ? (
          <ConcernPanel value={concern} onChange={setConcern} optional={talkToTechnician} />
        ) : (
          <View testID="custom-panel">
            <SectionHeading title={t.customTitle} subtitle={t.customSubtitle} />
            {list.isLoading ? (
              <ActivityIndicator
                testID="custom-loading"
                accessibilityLabel={t.servicesLoading}
                color={colors.input.lightSpinner}
                style={styles.loading}
              />
            ) : (
              <View style={styles.list}>
                {(list.data ?? []).map(item => (
                  <ServiceRow key={item.id} item={item} selected={services.includes(item.id)} onToggle={toggleService} />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </BookingLayout>
  );
}

/* step2.svg: option cards 173×98 (r12, 8pt apart, radio 9pt in, title 45pt down); the white panel r12 24pt
 * below them, 16pt padding; rows 8pt apart, 28pt under the subtitle. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    technician: { marginTop: 20, flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16 },
    technicianLabel: { marginLeft: 12, flex: 1 },
    modes: { flexDirection: 'row', gap: 8, marginTop: 8 },
    mode: { flex: 1, minHeight: 98, padding: 9 },
    modeTitle: { marginTop: 16 },
    modeSubtitle: { marginTop: 2 },
    panel: { marginTop: 24, padding: 16, borderRadius: radius.md, backgroundColor: colors.booking.card },
    list: { marginTop: 20, gap: 8 },
    loading: { marginVertical: 24 },
  });
