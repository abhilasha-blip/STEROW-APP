/**
 * Regression test for the Sign In input lag: typing must not re-render the screen, the full-screen
 * SVG background, the logo, the button or the country sheet. Only the field being typed in renders.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '@/constants/strings';
import { renderCounts, resetRenderCounts } from '../../../../test/renderCounter';
import { renderApp, resetAppState } from '../../../../test/render';

jest.mock('@/screens/auth/MobileEntryScreen', () =>
  require('../../../../test/renderCounter').tracked('Screen', jest.requireActual('@/screens/auth/MobileEntryScreen')),
);
jest.mock('@/components/AuthBackground', () =>
  require('../../../../test/renderCounter').tracked('AuthBackground', jest.requireActual('@/components/AuthBackground')),
);
jest.mock('@/components/Logo', () =>
  require('../../../../test/renderCounter').tracked('Logo', jest.requireActual('@/components/Logo')),
);
jest.mock('@/components/PrimaryButton', () =>
  require('../../../../test/renderCounter').tracked('PrimaryButton', jest.requireActual('@/components/PrimaryButton')),
);
jest.mock('@/components/CountrySheet', () =>
  require('../../../../test/renderCounter').tracked('CountrySheet', jest.requireActual('@/components/CountrySheet')),
);
jest.mock('@/components/CountryPrefix', () =>
  require('../../../../test/renderCounter').tracked('CountryPrefix', jest.requireActual('@/components/CountryPrefix')),
);
jest.mock('@/components/TextField', () =>
  require('../../../../test/renderCounter').tracked('TextField', jest.requireActual('@/components/TextField')),
);

const t = strings.mobileEntry;

beforeEach(resetAppState);
afterEach(resetAppState);

/** Types `text` one character at a time, like a keyboard does. */
async function typeSlowly(testID: string, text: string) {
  for (let i = 1; i <= text.length; i++) {
    await fireEvent.changeText(screen.getByTestId(testID), text.slice(0, i));
  }
}

async function measureTyping(testID: string, text: string) {
  await act(async () => {
    resetRenderCounts();
  });
  await typeSlowly(testID, text);
  return { ...renderCounts };
}

const STATIC_PARTS = ['Screen', 'AuthBackground', 'Logo', 'PrimaryButton', 'CountrySheet', 'CountryPrefix'];

describe('MobileEntry typing performance', () => {
  it('typing a 10-digit mobile number renders only the phone field', async () => {
    await renderApp();
    await screen.findByText(t.signin.title);
    const counts = await measureTyping('phone', '9876543210');
    for (const part of STATIC_PARTS) {
      expect({ part, renders: counts[part] ?? 0 }).toEqual({ part, renders: 0 });
    }
    // The text lives in the native input: typing clean digits re-renders nothing, not even the field.
    expect(counts.TextField ?? 0).toBe(0);
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9876543210');
  });

  it('sign-up name and referral fields render only themselves too', async () => {
    await renderApp();
    await screen.findByText(t.signin.title);
    await fireEvent.press(screen.getByTestId('switch-mode'));
    for (const [id, text] of [
      ['full-name', 'Ravi Kumar'],
      ['referral', 'STRAB12CD'],
    ] as const) {
      const counts = await measureTyping(id, text);
      for (const part of STATIC_PARTS) {
        expect({ id, part, renders: counts[part] ?? 0 }).toEqual({ id, part, renders: 0 });
      }
      expect(counts.TextField ?? 0).toBe(0);
    }
  });

  it('a keystroke that needs cleaning (a letter, a pasted +91) re-renders only the field, to correct it', async () => {
    await renderApp();
    await screen.findByText(t.signin.title);
    await act(async () => {
      resetRenderCounts();
    });
    await fireEvent.changeText(screen.getByTestId('phone'), '+91 98765-43210');
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9876543210');
    expect(renderCounts.TextField).toBe(1);
    expect(renderCounts.Screen ?? 0).toBe(0);
    // The next clean keystroke hands the text back to the native input.
    await fireEvent.changeText(screen.getByTestId('phone'), '987654321');
    expect(screen.getByTestId('phone').props.value).toBeUndefined();
    expect(screen.getByTestId('phone')).toHaveDisplayValue('987654321');
  });

  it('an inline error is cleared on the first keystroke with a single screen render', async () => {
    await renderApp();
    await screen.findByText(t.signin.title);
    await fireEvent.press(screen.getByRole('button', { name: t.submit }));
    expect(screen.getByText(t.invalidMobile.IN)).toBeTruthy();
    const counts = await measureTyping('phone', '98765');
    expect(screen.queryByText(t.invalidMobile.IN)).toBeNull();
    expect(counts.Screen).toBe(1);
    expect(counts.AuthBackground ?? 0).toBe(0);
  });
});
