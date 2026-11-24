import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import { EMPTY_DOCUMENTS } from '@/screens/onboarding/schemas';
import { strings } from '@/constants/strings';
import { Providers } from '../../../test/render';

/* The Dashboard ("My Documents") reuses the upload list without the onboarding shell. */
describe('reusable vehicle components (no onboarding header)', () => {
  it('DocumentsUploadList renders the four cards (RC, Insurance, Pollution, FASTag) under the selector slot', async () => {
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
    expect(screen.getByTestId('document-fastag')).toBeTruthy();
    expect(screen.queryByTestId('document-license')).toBeNull();
    expect(screen.getAllByText(strings.onboarding.documents.uploadFile)).toHaveLength(4);
    expect(screen.getAllByText(strings.onboarding.documents.addManually)).toHaveLength(4);
    expect(screen.queryByTestId('onboarding-step')).toBeNull();
  });
});
