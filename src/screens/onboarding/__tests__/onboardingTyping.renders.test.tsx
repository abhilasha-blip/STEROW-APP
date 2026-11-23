/**
 * Typing in an onboarding field must re-render that field only, not the whole step (header, layout,
 * footer). The step re-renders only when typing changes what it shows (a section, "Next" enabled).
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Providers } from '../../../../test/render';
import { renderCounts, resetRenderCounts } from '../../../../test/renderCounter';
import OnboardingProfileScreen from '../OnboardingProfileScreen';
import DrivingLicenceScreen from '../DrivingLicenceScreen';

jest.mock('@/components/OnboardingLayout', () =>
  require('../../../../test/renderCounter').tracked('Layout', jest.requireActual('@/components/OnboardingLayout')),
);

const renderInApp = (ui: React.ReactElement) =>
  render(
    <Providers>
      <NavigationContainer>{ui}</NavigationContainer>
    </Providers>,
  );

async function typeSlowly(testID: string, text: string) {
  await act(async () => resetRenderCounts());
  for (let i = 1; i <= text.length; i++) {
    await fireEvent.changeText(screen.getByTestId(testID), text.slice(0, i));
  }
  return { ...renderCounts };
}

describe('onboarding typing', () => {
  it('1/3: typing the full name does not re-render the step', async () => {
    await renderInApp(<OnboardingProfileScreen onNext={jest.fn()} onSkip={jest.fn()} />);
    const counts = await typeSlowly('full-name', 'Ravi Kumar');
    expect(counts.Layout ?? 0).toBe(0);
  });

  it('2/3: typing the DL number does not re-render the step', async () => {
    await renderInApp(<DrivingLicenceScreen onNext={jest.fn()} onSkip={jest.fn()} />);
    const counts = await typeSlowly('dl-number', 'TS01201');
    expect(counts.Layout ?? 0).toBe(0);
  });
});
