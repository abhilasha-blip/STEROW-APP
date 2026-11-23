import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { strings } from '@/constants/strings';
import { appError, backendMessages } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';
import { sendOtpButton } from '../../../../test/flows';
import { renderApp, resetAppState } from '../../../../test/render';
import { chooseCountry } from '../../../../test/flows';

const t = strings.mobileEntry;
const otpRequests = () => requestLog.filter(r => r.url === urls.otpRequest);

beforeEach(() => {
  resetAppState();
  requestLog.length = 0;
});
afterEach(resetAppState);

async function start() {
  await renderApp();
  await screen.findByText(t.signin.title);
}

describe('MobileEntry', () => {
  it('starts in sign-in mode and validates the phone inline', async () => {
    await start();
    expect(screen.getByText(t.signin.subtitle)).toBeTruthy();
    expect(screen.queryByTestId('full-name')).toBeNull();
    await fireEvent.press(sendOtpButton());
    expect(screen.getByText(t.invalidMobile.IN)).toBeTruthy();
    expect(otpRequests()).toHaveLength(0);
  });

  it('strips non-digits and a pasted +91, and caps the phone at 10 digits', async () => {
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '+91 98765-43210 99');
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9876543210');
  });

  it('switches modes in place keeping the typed number', async () => {
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText(t.signup.title)).toBeTruthy();
    expect(screen.getByText(t.signup.subtitle)).toBeTruthy();
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9876543210');
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText(t.signin.title)).toBeTruthy();
  });

  it('sign-up validates name and referral code inline', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('referral'), 'ab-12');
    expect(screen.getByTestId('referral')).toHaveDisplayValue('AB-12');
    await fireEvent.press(sendOtpButton());
    expect(screen.getByText(t.invalidFullName)).toBeTruthy();
    expect(screen.getByText(t.invalidMobile.IN)).toBeTruthy();
    expect(screen.getByText(t.invalidReferral)).toBeTruthy();
    expect(otpRequests()).toHaveLength(0);
  });

  it('sign-up sends name + upper-cased referral, toasts and opens Verify OTP', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('full-name'), ' Ravi  Kumar ');
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.changeText(screen.getByTestId('referral'), 'strab12cd');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.verifyOtp.title)).toBeTruthy();
    expect(screen.getByText(t.signup.otpSent)).toBeTruthy();
    expect(otpRequests()[0].body).toEqual({
      phone: '9876543210',
      purpose: 'signup',
      fullName: 'Ravi Kumar',
      referralCode: 'STRAB12CD',
    });
  });

  it('sign-up without a referral code omits it', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi');
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(sendOtpButton());
    await screen.findByText(strings.verifyOtp.title);
    expect(otpRequests()[0].body).toEqual({ phone: '9876543210', purpose: 'signup', fullName: 'Ravi' });
  });

  it('"already registered" on sign-up → toast + sign-in mode, number kept', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.alreadyRegistered), { status: 400 })));
    await start();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi');
    await fireEvent.changeText(screen.getByTestId('phone'), '9999999999');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.errors.alreadyRegistered)).toBeTruthy();
    expect(screen.getByText(t.signin.title)).toBeTruthy();
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9999999999');
  });

  it('"no account" on sign-in → toast + sign-up mode, number kept', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.noAccount), { status: 400 })));
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.errors.noAccount)).toBeTruthy();
    expect(screen.getByText(t.signup.title)).toBeTruthy();
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9876543210');
  });

  it.each([
    ['cooldown', HttpResponse.json(appError(backendMessages.cooldown), { status: 400 }), strings.errors.cooldown],
    ['network', HttpResponse.error(), strings.errors.network],
    ['500', HttpResponse.json({ message: 'boom' }, { status: 500 }), strings.errors.generic],
  ])('%s → toast', async (_name, response, message) => {
    server.use(http.post(urls.otpRequest, () => response.clone()));
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(t.signin.title)).toBeTruthy();
  });

  it('backend validation (raw JSON) → inline phone error, no JSON shown', async () => {
    const raw = JSON.stringify([{ message: backendMessages.invalidPhone }]);
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(raw), { status: 400 })));
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.errors.invalidPhone)).toBeTruthy();
    expect(screen.queryByText(/\[|\{/)).toBeNull();
  });

  it('ignores a second tap while the request is pending', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.post(urls.otpRequest, async () => {
        calls += 1;
        await gate;
        return HttpResponse.json({ data: { requestId: 'req-x', isNewUser: false } });
      }),
    );
    try {
      await start();
      await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
      await fireEvent.press(sendOtpButton());
      await fireEvent.press(sendOtpButton());
      await waitFor(() => expect(calls).toBe(1));
      release();
      await screen.findByText(strings.verifyOtp.title);
      expect(calls).toBe(1);
    } finally {
      release();
    }
  });
});

describe('MobileEntry: country picker', () => {
  const phoneInput = () => screen.getByTestId('phone');

  it('defaults to India: "🇮🇳 +91" prefix, 10-digit maxLength', async () => {
    await start();
    expect(screen.getByText('🇮🇳 +91')).toBeTruthy();
    expect(phoneInput().props.maxLength).toBe(10);
  });

  it('the sheet lists flag + name + dial code with a check on the selected country', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('country-prefix'));
    expect(screen.getByText(t.countrySheetTitle)).toBeTruthy();
    expect(screen.getByText(t.countryNames.IN)).toBeTruthy();
    expect(screen.getByText(t.countryNames.AE)).toBeTruthy();
    expect(screen.getByText('+971')).toBeTruthy();
    expect(screen.getByTestId('country-check-IN')).toBeTruthy();
    expect(screen.queryByTestId('country-check-AE')).toBeNull();
    // Re-selecting the current country just closes the sheet.
    await fireEvent.press(screen.getByTestId('country-option-IN'));
    expect(screen.queryByText(t.countrySheetTitle)).toBeNull();
  });

  it('switching to UAE updates prefix, maxLength and validation, and clears an invalid number', async () => {
    await start();
    await fireEvent.changeText(phoneInput(), '9876543210');
    await chooseCountry('AE');
    expect(screen.getByText('🇦🇪 +971')).toBeTruthy();
    expect(phoneInput()).toHaveDisplayValue(''); // an Indian number is not a valid UAE number
    expect(phoneInput().props.maxLength).toBe(10); // 9 digits + an optional trunk 0
    await fireEvent.press(sendOtpButton());
    expect(screen.getByText(t.invalidMobile.AE)).toBeTruthy();

    await fireEvent.changeText(phoneInput(), '531234567'); // 53 is not a UAE mobile prefix
    await fireEvent.press(sendOtpButton());
    expect(screen.getByText(t.invalidMobile.AE)).toBeTruthy();
    expect(otpRequests()).toHaveLength(0);
  });

  it('a number valid for the new country is kept', async () => {
    await start();
    await chooseCountry('AE');
    await fireEvent.changeText(phoneInput(), '501234567');
    await chooseCountry('IN');
    expect(phoneInput()).toHaveDisplayValue(''); // 9 digits: not a valid Indian number
    await fireEvent.changeText(phoneInput(), '+971 50 123 4567');
    expect(phoneInput()).toHaveDisplayValue('9715012345'); // India: no 971 stripping
  });

  it('UAE sign-in: strips the trunk 0, sends "971…" and VerifyOtp shows the UAE mask', async () => {
    await start();
    await chooseCountry('AE');
    await fireEvent.changeText(phoneInput(), '050 123 4567');
    expect(phoneInput()).toHaveDisplayValue('501234567');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.verifyOtp.title)).toBeTruthy();
    expect(otpRequests()[0].body).toEqual({ phone: '971501234567', purpose: 'signin' });
    expect(screen.getByText(strings.verifyOtp.description('+971 XX XXX 4567'))).toBeTruthy();
  });

  it('UAE sign-up body: "971…" + name; the country survives mode switches', async () => {
    await start();
    await chooseCountry('AE');
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText('🇦🇪 +971')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText('🇦🇪 +971')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Aisha Khan');
    await fireEvent.changeText(phoneInput(), '561234567');
    await fireEvent.press(sendOtpButton());
    await screen.findByText(strings.verifyOtp.title);
    expect(otpRequests()[0].body).toEqual({ phone: '971561234567', purpose: 'signup', fullName: 'Aisha Khan' });
  });

  it('back from VerifyOtp keeps the UAE country and number', async () => {
    await start();
    await chooseCountry('AE');
    await fireEvent.changeText(phoneInput(), '501234567');
    await fireEvent.press(sendOtpButton());
    await screen.findByText(strings.verifyOtp.title);
    // Back = change number: country and number are kept.
    await fireEvent.press(screen.getByRole('button', { name: strings.common.back }));
    await screen.findByText(t.signin.title);
    expect(screen.getByText('🇦🇪 +971')).toBeTruthy();
    expect(phoneInput()).toHaveDisplayValue('501234567');
  });

  it('backend phone rejection shows the selected country\'s message', async () => {
    server.use(
      http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.invalidPhone), { status: 400 })),
    );
    await start();
    await chooseCountry('AE');
    await fireEvent.changeText(phoneInput(), '501234567');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(t.invalidMobile.AE)).toBeTruthy();
  });

  it('remembers the last country on the device (default India)', async () => {
    const first = await renderApp();
    await screen.findByText(t.signin.title);
    expect(screen.getByText('🇮🇳 +91')).toBeTruthy();
    await chooseCountry('AE');
    expect(require('react-native-keychain').__store.get('sterow.pref.phoneCountry')?.password).toBe('AE');
    await first.unmount();
    resetAppState();

    await renderApp();
    await screen.findByText(t.signin.title);
    expect(await screen.findByText('🇦🇪 +971')).toBeTruthy();
    expect(phoneInput().props.maxLength).toBe(10);
  });

  it('a corrupt stored value falls back to India', async () => {
    require('react-native-keychain').__store.set('sterow.pref.phoneCountry', { password: 'XX' });
    await start();
    expect(screen.getByText('🇮🇳 +91')).toBeTruthy();
  });
});
