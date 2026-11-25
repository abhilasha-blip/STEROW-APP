import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { strings } from '@/constants/strings';
import { useAuthStore } from '@/store/auth.store';
import { appError, backendMessages, makeSession, TEST_OTP } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';
import { chooseCountry, confirmButton, goToVerify, sendOtpButton, typeOtp } from '../../../../test/flows';
import { renderApp, resetAppState } from '../../../../test/render';

const t = strings.verifyOtp;
const bodies = (url: string) => requestLog.filter(r => r.url === url).map(r => r.body as Record<string, unknown>);

/** Jump the clock past the resend cooldown; the countdown re-reads Date.now() on its next tick. */
function skipCooldown() {
  const realNow = Date.now.bind(Date);
  const offset = 31_000;
  jest.spyOn(Date, 'now').mockImplementation(() => realNow() + offset);
}

beforeEach(() => {
  resetAppState();
  requestLog.length = 0;
});
afterEach(resetAppState);

async function start() {
  await renderApp();
  await goToVerify('9999999999');
}

describe('VerifyOtp', () => {
  it('shows 6 boxes, the 6-digit copy with the masked number and a 30 s countdown', async () => {
    await start();
    expect(screen.getByText(t.description('XXXXX X9999'))).toBeTruthy();
    expect(t.description('X')).toContain('6-digit');
    expect(screen.getAllByLabelText(/^Digit \d/)).toHaveLength(6);
    expect(screen.getByTestId('resend-countdown')).toHaveTextContent('Resend code in 00:30');
    expect(screen.queryByTestId('resend')).toBeNull();
  });

  it('auto-submits 6 digits → session → Dashboard (store-driven)', async () => {
    await start();
    await typeOtp(TEST_OTP);
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(bodies(urls.otpVerify)).toEqual([{ requestId: 'req-1', otp: TEST_OTP, purpose: 'signin' }]);
    expect(useAuthStore.getState().status).toBe('signedIn');
  });

  it('Confirm with an incomplete code shows an inline error and sends nothing', async () => {
    await start();
    await typeOtp('123');
    await fireEvent.press(confirmButton());
    expect(screen.getByText(t.incompleteCode)).toBeTruthy();
    expect(bodies(urls.otpVerify)).toHaveLength(0);
  });

  it('wrong OTP: error + boxes cleared, stays; the next code succeeds (unlimited retries)', async () => {
    await start();
    await typeOtp('000000');
    expect(await screen.findByText(strings.errors.incorrectOtp)).toBeTruthy();
    expect(screen.getByTestId('otp-input').props.value).toBe('');
    expect(screen.getByText(t.title)).toBeTruthy();
    await typeOtp('111111');
    await screen.findByText(strings.errors.incorrectOtp);
    await typeOtp(TEST_OTP);
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(bodies(urls.otpVerify).map(b => b.requestId)).toEqual(['req-1', 'req-1', 'req-1']);
  });

  it('test-login wording for a wrong code is shown as "Incorrect OTP." inline', async () => {
    server.use(
      http.post(urls.otpVerify, () => HttpResponse.json(appError(backendMessages.incorrectTestOtp), { status: 400 })),
    );
    await start();
    await typeOtp('000000');
    expect(await screen.findByTestId('otp-error')).toHaveTextContent(strings.errors.incorrectOtp);
    expect(screen.queryByText(strings.errors.generic)).toBeNull();
  });

  it('expired OTP: mapped message and Resend enabled right away', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.json(appError(backendMessages.expired), { status: 400 })));
    await start();
    await typeOtp(TEST_OTP);
    expect(await screen.findByText(strings.errors.otpExpired)).toBeTruthy();
    expect(screen.getByTestId('resend')).toBeTruthy();
  });

  describe('too many wrong attempts', () => {
    const tooMany = 'Too many wrong attempts. Request a new OTP.';
    const boxesDisabled = () => screen.getByTestId('otp-input').props.editable === false;

    it.each([
      ['400 + "too many" text', () => HttpResponse.json(appError(tooMany), { status: 400 })],
      ['429', () => HttpResponse.json({ error: { code: 'too_many_requests', message: 'Rate limit' } }, { status: 429 })],
    ])('%s → the message (toast + inline), boxes cleared + disabled, Resend now; a resend re-enables', async (_n, reply) => {
      let verifyCalls = 0;
      server.use(
        http.post(urls.otpVerify, () => {
          verifyCalls += 1;
          return reply();
        }),
      );
      await start();
      expect(screen.queryByTestId('resend')).toBeNull(); // 30 s cooldown running
      await typeOtp('000000');
      expect(await screen.findByTestId('otp-error')).toHaveTextContent(strings.errors.tooManyAttempts);
      expect(screen.getAllByText(strings.errors.tooManyAttempts)).toHaveLength(2); // toast + inline
      expect(screen.queryByText(strings.common.genericError)).toBeNull();
      expect(screen.getByTestId('otp-input').props.value).toBe('');
      expect(boxesDisabled()).toBe(true);
      expect(screen.getByTestId('otp-boxes').props.accessibilityState).toMatchObject({ disabled: true });
      // Locked: Confirm sends nothing.
      await fireEvent.press(confirmButton());
      expect(verifyCalls).toBe(1);
      // Resend is offered right away; a successful resend re-enables the boxes with the new request.
      server.resetHandlers(); // verify succeeds again (default handler)
      await fireEvent.press(screen.getByTestId('resend'));
      expect(await screen.findByText(t.resent)).toBeTruthy();
      expect(boxesDisabled()).toBe(false);
      expect(screen.queryByTestId('otp-error')).toBeNull();
      await typeOtp(TEST_OTP);
      await screen.findByTestId('dashboard');
      expect(bodies(urls.otpVerify).at(-1)?.requestId).toBe('req-2');
    });

    it('Resend still inside the server cooldown: countdown restarts, the boxes stay locked with the message', async () => {
      server.use(http.post(urls.otpVerify, () => HttpResponse.json(appError(tooMany), { status: 400 })));
      await start();
      await typeOtp('000000');
      await screen.findByTestId('otp-error');
      server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.cooldown), { status: 400 })));
      await fireEvent.press(screen.getByTestId('resend'));
      expect(await screen.findByText(strings.errors.cooldown)).toBeTruthy();
      expect(screen.getByTestId('resend-countdown')).toHaveTextContent(/00:\d\d/);
      expect(boxesDisabled()).toBe(true);
      expect(screen.getByTestId('otp-error')).toHaveTextContent(strings.errors.tooManyAttempts);
    });

    it('Resend refused with "too many requests": the server text (toast + inline)', async () => {
      const serverText = 'Too many OTP requests for this number. Try again in 30 minutes.';
      server.use(http.post(urls.otpVerify, () => HttpResponse.json(appError(tooMany), { status: 400 })));
      await start();
      await typeOtp('000000');
      await screen.findByTestId('otp-error');
      server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(serverText), { status: 429 })));
      await fireEvent.press(screen.getByTestId('resend'));
      expect(await screen.findByTestId('otp-error')).toHaveTextContent(serverText);
      expect(screen.getAllByText(serverText).length).toBeGreaterThanOrEqual(1);
      expect(boxesDisabled()).toBe(true);
    });

    it('a generic 500 on verify still shows "Something went wrong. Please try again." (boxes stay usable)', async () => {
      server.use(http.post(urls.otpVerify, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
      await start();
      await typeOtp(TEST_OTP);
      expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
      expect(boxesDisabled()).toBe(false);
      expect(screen.queryByText(strings.errors.tooManyAttempts)).toBeNull();
    });
  });

  it('Resend after the cooldown replaces the requestId; the next verify uses the new one', async () => {
    await start();
    skipCooldown();
    await waitFor(() => expect(screen.getByTestId('resend')).toBeTruthy(), { timeout: 2500 });
    await fireEvent.press(screen.getByTestId('resend'));
    expect(await screen.findByText(t.resent)).toBeTruthy();
    expect(screen.getByTestId('resend-countdown')).toHaveTextContent(/00:30/);
    expect(bodies(urls.otpRequest)).toEqual([
      { phone: '9999999999', purpose: 'signin' },
      { phone: '9999999999', purpose: 'signin' },
    ]);
    await typeOtp(TEST_OTP);
    await screen.findByTestId('dashboard');
    expect(bodies(urls.otpVerify)[0].requestId).toBe('req-2');
  });

  it('UAE: Resend re-sends the "971…" number with the UAE mask on screen', async () => {
    await renderApp();
    await screen.findByText(strings.mobileEntry.signin.title);
    await chooseCountry('AE');
    await fireEvent.changeText(screen.getByTestId('phone'), '501234567');
    await fireEvent.press(sendOtpButton());
    expect(await screen.findByText(t.description('+971 XX XXX 4567'))).toBeTruthy();
    skipCooldown();
    await waitFor(() => expect(screen.getByTestId('resend')).toBeTruthy(), { timeout: 2500 });
    await fireEvent.press(screen.getByTestId('resend'));
    expect(await screen.findByText(t.resent)).toBeTruthy();
    expect(bodies(urls.otpRequest)).toEqual([
      { phone: '971501234567', purpose: 'signin' },
      { phone: '971501234567', purpose: 'signin' },
    ]);
  });

  it('Resend hitting the server cooldown → toast and the countdown restarts', async () => {
    await start();
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(backendMessages.cooldown), { status: 400 })));
    skipCooldown();
    await waitFor(() => expect(screen.getByTestId('resend')).toBeTruthy(), { timeout: 2500 });
    await fireEvent.press(screen.getByTestId('resend'));
    expect(await screen.findByText(strings.errors.cooldown)).toBeTruthy();
    expect(screen.getByTestId('resend-countdown')).toHaveTextContent(/00:30/);
  });

  it('Resend network failure → toast, Resend stays available', async () => {
    await start();
    server.use(http.post(urls.otpRequest, () => HttpResponse.error()));
    skipCooldown();
    await waitFor(() => expect(screen.getByTestId('resend')).toBeTruthy(), { timeout: 2500 });
    await fireEvent.press(screen.getByTestId('resend'));
    expect(await screen.findByText(strings.errors.network)).toBeTruthy();
    expect(screen.getByTestId('resend')).toBeTruthy();
  });

  it('verify network failure → toast, code kept on screen', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.error()));
    await start();
    await typeOtp(TEST_OTP);
    expect(await screen.findByText(strings.errors.network)).toBeTruthy();
    expect(screen.getByText(t.title)).toBeTruthy();
  });

  it('back = change number: the entered values are kept', async () => {
    await start();
    await fireEvent.press(screen.getByRole('button', { name: strings.common.back }));
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect(screen.getByTestId('phone')).toHaveDisplayValue('9999999999');
  });

  it('no double submit: Confirm while verifying sends one request', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.post(urls.otpVerify, async () => {
        calls += 1;
        await gate;
        return HttpResponse.json({ data: makeSession() });
      }),
    );
    try {
      await start();
      await typeOtp(TEST_OTP); // auto-submit
      await fireEvent.press(confirmButton());
      await fireEvent.press(confirmButton());
      await waitFor(() => expect(calls).toBe(1));
      release();
      await screen.findByTestId('dashboard');
      expect(calls).toBe(1);
    } finally {
      release();
    }
  });

  it('bootstrap failure after verify: spinner stops, error toast, still signed out', async () => {
    server.use(
      http.get(urls.userDetails, () => HttpResponse.json({ code: '42501', message: 'denied' }, { status: 403 })),
    );
    await start();
    await typeOtp(TEST_OTP);
    expect(await screen.findByText(strings.errors.generic)).toBeTruthy();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(screen.getByRole('button', { name: t.submit })).toBeTruthy();
  });
});
