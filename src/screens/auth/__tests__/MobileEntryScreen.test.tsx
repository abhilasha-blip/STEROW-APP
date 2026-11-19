import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { strings } from '@/constants/strings';
import { appError, backendMessages } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';
import { sendOtpButton } from '../../../../test/flows';
import { renderApp, resetAppState } from '../../../../test/render';

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
    expect(screen.getByText(t.invalidMobile)).toBeTruthy();
    expect(otpRequests()).toHaveLength(0);
  });

  it('strips non-digits and caps the phone at 10 digits', async () => {
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '+91 98765-43210 99');
    expect(screen.getByTestId('phone').props.value).toBe('9198765432');
  });

  it('switches modes in place keeping the typed number', async () => {
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText(t.signup.title)).toBeTruthy();
    expect(screen.getByText(t.signup.subtitle)).toBeTruthy();
    expect(screen.getByTestId('phone').props.value).toBe('9876543210');
    await fireEvent.press(screen.getByTestId('switch-mode'));
    expect(screen.getByText(t.signin.title)).toBeTruthy();
  });

  it('sign-up validates name and referral code inline', async () => {
    await start();
    await fireEvent.press(screen.getByTestId('switch-mode'));
    await fireEvent.changeText(screen.getByTestId('referral'), 'ab-12');
    expect(screen.getByTestId('referral').props.value).toBe('AB-12');
    await fireEvent.press(sendOtpButton());
    expect(screen.getByText(t.invalidFullName)).toBeTruthy();
    expect(screen.getByText(t.invalidMobile)).toBeTruthy();
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
    expect(screen.getByTestId('phone').props.value).toBe('9999999999');
  });

  it('"no account" on sign-in → toast + sign-up mode, number kept', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.noAccount), { status: 400 })));
    await start();
    await fireEvent.changeText(screen.getByTestId('phone'), '9876543210');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(strings.errors.noAccount)).toBeTruthy();
    expect(screen.getByText(t.signup.title)).toBeTruthy();
    expect(screen.getByTestId('phone').props.value).toBe('9876543210');
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
