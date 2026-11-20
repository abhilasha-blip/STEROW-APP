/**
 * MOCK data for onboarding step 4 (UI only). Service types come from the API and the centre search
 * from the API / Google Places later.
 */
export const MOCK_SERVICE_TYPES = [
  { value: 'general-service', label: 'General Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'accident-repair', label: 'Accident Repair' },
  { value: 'tyre-change', label: 'Tyre Change' },
  { value: 'battery', label: 'Battery' },
  { value: 'other', label: 'Other' },
] as const;

export type MockServiceCentre = { id: string; name: string; area: string; authorised: boolean };

export const MOCK_SERVICE_CENTRES: readonly MockServiceCentre[] = [
  { id: 'c1', name: 'MG Hitech City', area: 'Madhapur, Hyderabad', authorised: true },
  { id: 'c2', name: 'MG Banjara Hills', area: 'Banjara Hills, Hyderabad', authorised: true },
  { id: 'c3', name: 'Tata Motors – Kukatpally', area: 'Kukatpally, Hyderabad', authorised: true },
  { id: 'c4', name: 'Maruti Suzuki Arena – Gachibowli', area: 'Gachibowli, Hyderabad', authorised: true },
  { id: 'c5', name: 'Hyundai Service – Begumpet', area: 'Begumpet, Hyderabad', authorised: true },
  { id: 'c6', name: 'GoMechanic – Kondapur', area: 'Kondapur, Hyderabad', authorised: false },
  { id: 'c7', name: 'Speedy Car Care', area: 'Ameerpet, Hyderabad', authorised: false },
  { id: 'c8', name: 'City Auto Works', area: 'Secunderabad', authorised: false },
];
