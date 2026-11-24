/**
 * UI-only mock, replace with API.
 *
 * Everything the Book a Service flow shows except the user's vehicles (which are real): services,
 * service centres, time slots, saved addresses, voice languages and the concern examples. Only
 * src/services/bookingService.ts reads this file. Never show these as the user's own data elsewhere
 * (e.g. no fake bookings on the Dashboard).
 *
 * Centre names / logos / ratings come from design/book-service/step3.svg (the logos were cut from it,
 * see src/assets/images/book-service).
 */
import type {
  Address,
  ServiceCentre,
  ServiceItem,
  TimeSlot,
  VoiceLanguage,
} from '@/services/bookingService';

const LOGOS = {
  mg: require('@/assets/images/book-service/centre-mg.png'),
  bosch: require('@/assets/images/book-service/centre-bosch.png'),
  goodyear: require('@/assets/images/book-service/centre-goodyear.png'),
  mahindra: require('@/assets/images/book-service/centre-mahindra.png'),
  mrf: require('@/assets/images/book-service/centre-mrf.png'),
};

/** step2.svg "Custom Services" list, in order. */
export const MOCK_SERVICES: ServiceItem[] = [
  { id: 'headlight', title: 'Headlight Issue', subtitle: 'Not working or dim light', icon: 'headlight' },
  { id: 'brake-pads', title: 'Check Brake Pads', subtitle: 'Inspection & replacement if needed', icon: 'brakePads' },
  { id: 'gear', title: 'Gear Issue', subtitle: 'Difficult in shifting gears', icon: 'gear' },
  { id: 'bumper', title: 'Front Bumper', subtitle: 'Repair or replacement for damage', icon: 'bumper' },
  { id: 'battery', title: 'Battery Issue', subtitle: 'Battery not holding charge', icon: 'battery' },
  { id: 'ac', title: 'AC Not Cooling', subtitle: 'Cooling issue or gas refill', icon: 'ac' },
  { id: 'engine', title: 'Engine Check', subtitle: 'Engine noise or performance issue', icon: 'engine' },
  { id: 'tyre', title: 'Tyre/Wheel Issue', subtitle: 'Tyre replacement or puncture fix', icon: 'tyre' },
];

/** step3.svg's five centres first (the "Best match" order), then seven more so "Found (12)" is real. */
export const MOCK_CENTRES: ServiceCentre[] = [
  { id: 'c-mg-gachibowli', name: 'MG Service Center-Gachibowli', address: 'Survey No. 112, Gachibowli, Hyderabad', logo: LOGOS.mg, badges: ['authorised'], rating: 4.6, ratingCount: 320, distanceKm: 3.2 },
  { id: 'c-bosch-kondapur', name: 'Bosch Car Center-Kondapur', address: 'Kothaguda road, Kondapur, Hyderabad', logo: LOGOS.bosch, badges: ['certified'], rating: 4.4, ratingCount: 280, distanceKm: 4.8 },
  { id: 'c-goodyear-madhapur', name: 'Goodyear Autocar-Madhapur', address: 'Madhapur Main Road, Hyderabad', logo: LOGOS.goodyear, badges: ['multiBrand'], rating: 4.3, ratingCount: 190, distanceKm: 5.6 },
  { id: 'c-mahindra-hitec', name: 'Mahindra Service Center-Hitec City', address: 'Hitec City, Hyderabad', logo: LOGOS.mahindra, badges: ['authorised'], rating: 4.5, ratingCount: 410, distanceKm: 5.8 },
  { id: 'c-mrf-miyapur', name: 'MRF Tyres & Service - Miyapur', address: 'Miyapur, Hyderabad', logo: LOGOS.mrf, badges: ['certified'], rating: 4.2, ratingCount: 160, distanceKm: 6.2 },
  { id: 'c-mg-kukatpally', name: 'MG Service Center-Kukatpally', address: 'JNTU Road, Kukatpally, Hyderabad', logo: LOGOS.mg, badges: ['authorised'], rating: 4.7, ratingCount: 512, distanceKm: 8.4 },
  { id: 'c-bosch-banjara', name: 'Bosch Car Service-Banjara Hills', address: 'Road No. 12, Banjara Hills, Hyderabad', logo: LOGOS.bosch, badges: ['certified', 'multiBrand'], rating: 4.1, ratingCount: 98, distanceKm: 9.1 },
  { id: 'c-goodyear-begumpet', name: 'Goodyear Autocar-Begumpet', address: 'SP Road, Begumpet, Hyderabad', logo: LOGOS.goodyear, badges: ['multiBrand'], rating: 3.9, ratingCount: 74, distanceKm: 11.3 },
  { id: 'c-mahindra-jubilee', name: 'Mahindra Service Center-Jubilee Hills', address: 'Road No. 36, Jubilee Hills, Hyderabad', logo: LOGOS.mahindra, badges: ['authorised'], rating: 4.4, ratingCount: 233, distanceKm: 7.5 },
  { id: 'c-mrf-kompally', name: 'MRF Tyres & Service - Kompally', address: 'NH 44, Kompally, Hyderabad', logo: LOGOS.mrf, badges: ['certified'], rating: 4.0, ratingCount: 121, distanceKm: 18.6 },
  { id: 'c-bosch-uppal', name: 'Bosch Car Service-Uppal', address: 'Uppal Main Road, Hyderabad', logo: LOGOS.bosch, badges: ['multiBrand'], rating: 4.3, ratingCount: 140, distanceKm: 21.4 },
  { id: 'c-mg-lbnagar', name: 'MG Service Center-LB Nagar', address: 'Sagar Ring Road, LB Nagar, Hyderabad', logo: LOGOS.mg, badges: ['authorised'], rating: 4.5, ratingCount: 302, distanceKm: 24.9 },
];

/** step4.svg time slots. */
export const MOCK_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-9', label: '9 am - 11 am', startHour: 9, endHour: 11 },
  { id: 'slot-11', label: '11 am - 1 pm', startHour: 11, endHour: 13 },
  { id: 'slot-14', label: '2 pm - 4 pm', startHour: 14, endHour: 16 },
];

/** Shown ONLY in the address sheet's "Saved addresses" list (never pre-filled as the user's address). */
export const MOCK_SAVED_ADDRESSES: Address[] = [
  { id: 'a-home', label: 'Home', line: 'Survey No. 112, Gachibowli, Hyderabad' },
  { id: 'a-office', label: 'Office', line: 'Plot 7, Hitec City Phase 2, Hyderabad' },
];

export const MOCK_VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
];

/** step2.svg's example prompts (the collapsible hint under the concern box). */
export const MOCK_CONCERN_EXAMPLES: readonly string[] = [
  'There is a weird noise coming from the front side when driving.',
  'The AC is not cooling properly, even at low temperature.',
  'Please check the battery health and let me know if it needs replacement.',
  'Also, the right side wiper is not working.',
];
