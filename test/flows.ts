import { fireEvent, screen } from '@testing-library/react-native';
import type { CountryCode } from '@/constants/countries';
import { strings } from '@/constants/strings';

export const sendOtpButton = () => screen.getByRole('button', { name: strings.mobileEntry.submit });
export const confirmButton = () => screen.getByRole('button', { name: strings.verifyOtp.submit });

/** From the signed-out start screen to Verify OTP (signin mode). */
export async function goToVerify(phone = '9999999999') {
  await screen.findByText(strings.mobileEntry.signin.title);
  await fireEvent.changeText(screen.getByTestId('phone'), phone);
  await fireEvent.press(sendOtpButton());
  await screen.findByText(strings.verifyOtp.title);
}

export const typeOtp = (code: string) => fireEvent.changeText(screen.getByTestId('otp-input'), code);

/** Opens the country sheet on MobileEntry and picks a country. */
export async function chooseCountry(country: CountryCode) {
  await fireEvent.press(screen.getByTestId('country-prefix'));
  await fireEvent.press(screen.getByTestId(`country-option-${country}`));
}

/** Dashboard → menu → drawer "Logout". */
export async function logOut() {
  await fireEvent.press(await screen.findByTestId('dashboard-menu'));
  await fireEvent.press(await screen.findByTestId('drawer-logout'));
}
