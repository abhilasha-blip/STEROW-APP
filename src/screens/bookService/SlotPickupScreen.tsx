import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import CheckCircle from '@/assets/icons/check-circle.svg';
import Phone from '@/assets/icons/book-service/phone.svg';
import Pin from '@/assets/icons/book-service/pin.svg';
import AppText from '@/components/AppText';
import LinkButton from '@/components/LinkButton';
import { useToast } from '@/components/Toast';
import { COUNTRIES } from '@/constants/countries';
import { strings } from '@/constants/strings';
import { useCreateBooking, useSavedAddresses, useTimeSlots } from '@/hooks/api/useBookService';
import type { BookServiceStackScreenProps, HomeStackParamList } from '@/navigation/types';
import type { Address, BookingRequest } from '@/services/bookingService';
import { useAuthStore } from '@/store/auth.store';
import { BOOKING_DAYS, canSubmit, effectiveDrop, useBookingStore, type BookingValues } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { isPastDate, isSlotPast, upcomingDates } from '@/utils/bookingDates';
import { isValidMobile, parseApiPhone } from '@/utils/phone';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AddressSheet from './components/AddressSheet';
import BookingLayout, { useRevealOnFocus } from './components/BookingLayout';
import SectionHeading from './components/SectionHeading';
import SelectionIndicator from './components/SelectionIndicator';

const t = strings.bookService.slot;

/** The request the (mock) service receives. */
export function toBookingRequest(v: BookingValues): BookingRequest {
  const drop = effectiveDrop(v);
  return {
    vehicleId: v.vehicleId ?? '',
    serviceMode: v.serviceMode,
    concern: v.serviceMode === 'concern' ? v.concern.trim() : '',
    talkToTechnician: v.talkToTechnician,
    services: v.serviceMode === 'custom' ? v.services : [],
    centreId: v.centreId ?? '',
    date: v.date ?? '',
    slotId: v.slot ?? '',
    pickup: v.pickup.enabled && v.pickup.address ? { addressLine: v.pickup.address.line, phone: v.pickup.phone } : null,
    drop: !v.drop.enabled
      ? null
      : v.drop.confirmLater
        ? { confirmLater: true }
        : { addressLine: drop.address?.line ?? '', phone: drop.phone },
  };
}

/** A checkbox row ("Pickup", "Same as pickup address"). */
function CheckRow({ testID, label, checked, onToggle, small = false }: { testID: string; label: string; checked: boolean; onToggle: () => void; small?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      style={[styles.checkRow, small && styles.checkRowSmall]}
    >
      <SelectionIndicator kind="checkbox" selected={checked} />
      <AppText variant={small ? 'body' : 'bodyLarge'} color="booking.text" style={styles.checkLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** "From Address (Pickup Location)          Change" */
function AddressHeader({ title, hint, onChange, changeA11y, testID }: { title: string; hint: string; onChange?: () => void; changeA11y: string; testID: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.addressHeader}>
      <AppText variant="rowTitle" color="booking.title">
        {title}
      </AppText>
      <AppText variant="rowSubtitle" color="booking.subtitle" style={styles.addressHint}>
        {hint}
      </AppText>
      {onChange && (
        <LinkButton testID={`${testID}-change`} label={t.change} accessibilityLabel={changeA11y} onPress={onChange} variant="linkSmall" />
      )}
    </View>
  );
}

/** The 43pt mist row with a pin (tap → address sheet) or a phone (input). */
function FieldRow({ icon, children, disabled }: { icon: ReactNode; children: ReactNode; disabled?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, disabled && styles.fieldDisabled]}>
      {icon}
      <View style={styles.fieldBody}>{children}</View>
    </View>
  );
}

type PhoneProps = { testID: string; value: string; onChange?: (v: string) => void; disabled: boolean; a11y: string };

function PhoneRow({ testID, value, onChange, disabled, a11y }: PhoneProps) {
  const { colors, typography } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const country = useBookingStore(s => s.phoneCountry);
  const reveal = useRevealOnFocus();
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const invalid = !disabled && value.length > 0 && !isValidMobile(country, value);
  const color = disabled ? colors.booking.fieldDisabledText : colors.booking.text;
  return (
    <>
      <FieldRow icon={<Phone width={24} height={24} color={colors.booking.fieldIcon} />} disabled={disabled}>
        <View style={styles.phoneRow}>
          <AppText variant="bodyLarge" style={[styles.prefix, { color }]}>
            {`+${COUNTRIES[country].dialCode}`}
          </AppText>
          <TextInput
            ref={ref}
            testID={testID}
            value={value}
            onChangeText={v => onChange?.(v.replace(/\D/g, ''))}
            editable={!disabled}
            keyboardType="phone-pad"
            maxLength={COUNTRIES[country].length}
            placeholder={t.phonePlaceholder}
            placeholderTextColor={colors.booking.muted}
            accessibilityLabel={a11y}
            accessibilityState={{ disabled }}
            accessibilityHint={invalid ? t.phoneInvalid : undefined}
            selectionColor={colors.primary.main}
            onFocus={() => reveal(ref.current)}
            style={[styles.input, typography.variants.bodyLarge, { color }]}
          />
        </View>
      </FieldRow>
      {invalid && (
        <AppText testID={`${testID}-error`} variant="error" color="status.errorOnLight" style={styles.fieldError}>
          {t.phoneInvalid}
        </AppText>
      )}
    </>
  );
}

function AddressRow({ testID, address, onPress, disabled }: { testID: string; address: Address | null; onPress?: () => void; disabled: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={address?.line ?? t.selectAddress}
      accessibilityState={{ disabled }}
    >
      <FieldRow icon={<Pin width={24} height={24} color={colors.booking.fieldIcon} />} disabled={disabled}>
        <AppText
          variant="bodyLarge"
          color={disabled || !address ? 'booking.fieldDisabledText' : 'booking.text'}
          numberOfLines={2}
        >
          {address?.line ?? t.selectAddress}
        </AppText>
      </FieldRow>
    </Pressable>
  );
}

/**
 * Step 4 – Slot & Pickup/Drop (step4.svg, step4-1.svg): 14 date chips from today, three time slots (a
 * slot that already started today is disabled), then Pickup / Drop with addresses and phones. Drop adds
 * "Same as pickup address" and the new "Confirm drop address after service completion" (exclusive).
 * Submit → Congratulations; disabled until canSubmit().
 */
export default function SlotPickupScreen({ navigation }: BookServiceStackScreenProps<'BookSlot'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();
  const values = useBookingStore();
  const slots = useTimeSlots();
  const saved = useSavedAddresses();
  const createBooking = useCreateBooking();
  const userPhone = useAuthStore(s => s.user?.phone ?? '');
  const [sheet, setSheet] = useState<'pickup' | 'drop' | null>(null);
  const now = useMemo(() => new Date(), []);
  const dates = useMemo(() => upcomingDates(now, BOOKING_DAYS), [now]);
  const date = values.date && !isPastDate(values.date, now) ? values.date : null;
  const { pickup, drop } = values;

  const defaultPhone = useMemo(() => (userPhone ? parseApiPhone(userPhone) : null), [userPhone]);
  const enablePickup = (on: boolean) => {
    if (defaultPhone) {
      values.setPhoneCountry(defaultPhone.country);
    }
    values.setPickupEnabled(on, defaultPhone?.national);
  };
  const enableDrop = (on: boolean) => {
    if (defaultPhone) {
      values.setPhoneCountry(defaultPhone.country);
    }
    values.setDropEnabled(on, defaultPhone?.national);
  };
  const chooseDate = (iso: string) => {
    values.setDate(iso);
    const slot = slots.data?.find(s => s.id === values.slot);
    if (slot && isSlotPast(slot, iso, now)) {
      values.setSlot(null);
    }
  };

  const allAddresses = [...(saved.data ?? []), ...values.addresses];
  const mirrored = effectiveDrop(values);
  const ready = canSubmit({ ...values, date });

  const submit = () =>
    createBooking.mutate(toBookingRequest({ ...values, date }), {
      onSuccess: () =>
        // Replace the flow with Congratulations: Back from there lands on the dashboard.
        navigation
          .getParent<NativeStackNavigationProp<HomeStackParamList>>()
          ?.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'BookingSuccess' }] }),
      onError: () => toast.error(strings.bookService.submitError),
    });

  return (
    <BookingLayout
      testID="book-slot"
      step={4}
      onBack={() => navigation.goBack()}
      primaryLabel={strings.bookService.submit}
      onPrimary={submit}
      primaryDisabled={!ready}
      primaryLoading={createBooking.isPending}
    >
      <SectionHeading title={t.title} subtitle={t.subtitle} />
      <View style={styles.card}>
        <SectionHeading title={t.dateTimeTitle} subtitle={t.dateTimeSubtitle} />

        <AppText variant="fieldLabel" color="booking.text" style={styles.label}>
          {t.selectDate}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dates}
          accessibilityRole="radiogroup"
          accessibilityLabel={t.dateA11y}
        >
          {dates.map(d => {
            const selected = d.iso === date;
            return (
              <Pressable
                key={d.iso}
                testID={`date-${d.iso}`}
                onPress={() => chooseDate(d.iso)}
                accessibilityRole="radio"
                accessibilityLabel={`${d.weekday} ${d.dayMonth}`}
                accessibilityState={{ checked: selected }}
                style={[styles.dateChip, selected && styles.chipSelected]}
              >
                <View style={styles.dateText}>
                  <AppText variant={selected ? 'chipSelected' : 'chip'} color={selected ? 'booking.chipSelectedText' : 'booking.chipText'}>
                    {d.weekday}
                  </AppText>
                  <AppText variant={selected ? 'chipSelected' : 'chip'} color={selected ? 'booking.chipSelectedText' : 'booking.chipText'}>
                    {d.dayMonth}
                  </AppText>
                </View>
                {selected && <CheckCircle width={16} height={16} color={colors.booking.controlSelected} style={styles.dateCheck} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <AppText variant="fieldLabel" color="booking.text" style={styles.labelTime}>
          {t.selectTime}
        </AppText>
        {slots.isLoading ? (
          <ActivityIndicator color={colors.input.lightSpinner} style={styles.loading} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slots}
            accessibilityRole="radiogroup"
            accessibilityLabel={t.timeA11y}
          >
            {(slots.data ?? []).map(slot => {
              const past = !!date && isSlotPast(slot, date, now);
              const selected = slot.id === values.slot && !past;
              return (
                <Pressable
                  key={slot.id}
                  testID={`slot-${slot.id}`}
                  onPress={() => values.setSlot(slot.id)}
                  disabled={past}
                  accessibilityRole="radio"
                  accessibilityLabel={past ? t.slotPastA11y(slot.label) : slot.label}
                  accessibilityState={{ checked: selected, disabled: past }}
                  style={[styles.slotChip, selected && styles.chipSelected, past && styles.past]}
                >
                  <AppText variant={selected ? 'chipSelected' : 'chip'} color={selected ? 'booking.chipSelectedText' : 'booking.chipText'}>
                    {slot.label}
                  </AppText>
                  {selected && <CheckCircle width={16} height={16} color={colors.booking.controlSelected} style={styles.slotCheck} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.divider} />
        <SectionHeading title={t.pickupDropTitle} subtitle={t.pickupDropSubtitle} />

        <CheckRow testID="pickup-toggle" label={t.pickup} checked={pickup.enabled} onToggle={() => enablePickup(!pickup.enabled)} />
        {pickup.enabled && (
          <View testID="pickup-section" style={styles.section}>
            <AddressHeader
              testID="pickup"
              title={t.fromAddress}
              hint={t.fromAddressHint}
              onChange={() => setSheet('pickup')}
              changeA11y={t.changePickupA11y}
            />
            <AddressRow testID="pickup-address" address={pickup.address} onPress={() => setSheet('pickup')} disabled={false} />
            <View style={styles.gap} />
            <PhoneRow testID="pickup-phone" value={pickup.phone} onChange={values.setPickupPhone} disabled={false} a11y={t.pickupPhoneA11y} />
          </View>
        )}
        <View style={styles.dividerThin} />

        <CheckRow testID="drop-toggle" label={t.drop} checked={drop.enabled} onToggle={() => enableDrop(!drop.enabled)} />
        {drop.enabled && (
          <View testID="drop-section" style={styles.section}>
            <AddressHeader
              testID="drop"
              title={t.toAddress}
              hint={t.toAddressHint}
              onChange={drop.sameAsPickup || drop.confirmLater ? undefined : () => setSheet('drop')}
              changeA11y={t.changeDropA11y}
            />
            {pickup.enabled && (
              <CheckRow small testID="drop-same" label={t.sameAsPickup} checked={drop.sameAsPickup} onToggle={() => values.setSameAsPickup(!drop.sameAsPickup)} />
            )}
            <CheckRow small testID="drop-later" label={t.confirmDropLater} checked={drop.confirmLater} onToggle={() => values.setConfirmDropLater(!drop.confirmLater)} />
            {drop.confirmLater ? (
              <AppText testID="drop-later-help" variant="body" color="booking.subtitle" style={styles.help}>
                {t.confirmDropLaterHelp}
              </AppText>
            ) : (
              <View testID="drop-fields">
                <AddressRow
                  testID="drop-address"
                  address={drop.sameAsPickup ? mirrored.address : drop.address}
                  onPress={() => setSheet('drop')}
                  disabled={drop.sameAsPickup}
                />
                <View style={styles.gap} />
                <PhoneRow
                  testID="drop-phone"
                  value={drop.sameAsPickup ? mirrored.phone : drop.phone}
                  onChange={values.setDropPhone}
                  disabled={drop.sameAsPickup}
                  a11y={t.dropPhoneA11y}
                />
              </View>
            )}
          </View>
        )}
      </View>

      <AddressSheet
        visible={sheet !== null}
        addresses={allAddresses}
        loading={saved.isLoading}
        selectedId={(sheet === 'drop' ? drop.address : pickup.address)?.id ?? null}
        onSelect={a => (sheet === 'drop' ? values.setDropAddress(a) : values.setPickupAddress(a))}
        onAdd={a => {
          values.addAddress(a);
          if (sheet === 'drop') {
            values.setDropAddress(a);
          } else {
            values.setPickupAddress(a);
          }
        }}
        onClose={() => setSheet(null)}
      />
    </BookingLayout>
  );
}

/* step4-1.svg (x − 16): card r12 16pt padding; date chips 62×57 (selected 84, check 8pt from the right,
 * 11pt down) 8pt apart; slot chips 40pt; dividers black 8%; address / phone rows 322×43 r8 mist50 with a
 * 24pt slate icon 5pt in and the text 30pt in, 8pt apart. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    card: { marginTop: 24, padding: 16, borderRadius: radius.md, backgroundColor: colors.booking.card },
    label: { marginTop: 24, marginBottom: 10 },
    labelTime: { marginTop: 24, marginBottom: 10 },
    dates: { gap: 8, paddingRight: 4 },
    dateChip: {
      flexDirection: 'row',
      minWidth: 62,
      height: 58,
      paddingHorizontal: 9,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.chipBorder,
      backgroundColor: colors.booking.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateText: { alignItems: 'center' },
    dateCheck: { alignSelf: 'flex-start', marginTop: 10, marginLeft: 6 },
    chipSelected: { borderColor: colors.booking.cardSelectedBorder },
    slots: { gap: 8, paddingRight: 4 },
    slotChip: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 40,
      paddingHorizontal: 9,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.chipBorder,
      backgroundColor: colors.booking.chip,
    },
    slotCheck: { marginLeft: 8 },
    past: { opacity: 0.4 },
    loading: { marginVertical: 12 },
    divider: { height: 1, backgroundColor: colors.booking.divider, marginVertical: 24 },
    dividerThin: { height: 1, backgroundColor: colors.booking.divider },
    checkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
    checkRowSmall: { minHeight: 36 },
    checkLabel: { marginLeft: 16, flex: 1 },
    section: { paddingBottom: 16 },
    addressHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 32, marginBottom: 8 },
    addressHint: { flex: 1, marginLeft: 8 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 43,
      paddingLeft: 5,
      paddingRight: 12,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.booking.fieldBorder,
      backgroundColor: colors.booking.field,
    },
    fieldDisabled: { opacity: 0.8 },
    fieldBody: { flex: 1, marginLeft: 1, paddingVertical: 10 },
    phoneRow: { flexDirection: 'row', alignItems: 'center' },
    prefix: { marginRight: 6 },
    input: { flex: 1, padding: 0 },
    fieldError: { marginTop: 4 },
    gap: { height: 8 },
    help: { marginTop: 4 },
  });
