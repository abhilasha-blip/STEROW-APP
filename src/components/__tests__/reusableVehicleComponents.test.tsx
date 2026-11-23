import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import VehicleForm from '@/components/VehicleForm';
import { useVehicleForm } from '@/hooks/useVehicleForm';
import { EMPTY_DOCUMENTS } from '@/screens/onboarding/schemas';
import { Providers } from '../../../test/render';

/*
 * The Dashboard ("My Vehicles" / "My Documents") will reuse these without the onboarding shell, with a
 * vehicle-selector dropdown above the fields.
 */
function VehicleFormHost() {
  const { form } = useVehicleForm({ initialValues: { vehicleNumber: 'TS09EV1234' } });
  return <VehicleForm form={form} header={<Text testID="vehicle-selector">Selector</Text>} />;
}

describe('reusable vehicle components (no onboarding header)', () => {
  it('VehicleForm renders outside OnboardingLayout with the selector slot above the fields', async () => {
    await render(
      <Providers>
        <VehicleFormHost />
      </Providers>,
    );
    expect(screen.getByTestId('vehicle-selector')).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.queryByTestId('onboarding-step')).toBeNull();
  });

  it('DocumentsUploadList renders the three cards (RC, Insurance, Pollution) under the selector slot', async () => {
    await render(
      <Providers>
        <DocumentsUploadList
          values={EMPTY_DOCUMENTS}
          onChange={jest.fn()}
          header={<Text testID="vehicle-selector">Selector</Text>}
        />
      </Providers>,
    );
    expect(screen.getByTestId('vehicle-selector')).toBeTruthy();
    expect(screen.getByTestId('document-rc')).toBeTruthy();
    expect(screen.getByTestId('document-insurance')).toBeTruthy();
    expect(screen.getByTestId('document-pollution')).toBeTruthy();
    expect(screen.queryByTestId('document-license')).toBeNull();
    expect(screen.queryByTestId('onboarding-step')).toBeNull();
  });
});
