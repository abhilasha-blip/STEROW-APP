import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Providers } from '../../../../../test/render';
import DashboardHeader, { CAR_FADE, CAR_RECT, GLOW_STOPS } from '../DashboardHeader';

const noop = () => {};

describe('DashboardHeader art (dashboard.svg)', () => {
  it('draws the car photo at the Figma rect, masked so its black edges fade (no hard black block)', async () => {
    await render(
      <Providers>
        <DashboardHeader firstName="John" email="john@example.com" onMenu={noop} onBell={noop} onSos={noop} />
      </Providers>,
    );
    // Inside the SVG (an RNSVGImage, not a plain RN <Image> rectangle), at the Figma rect, stretched
    // like the Figma fill (preserveAspectRatio "none" → align "none").
    const car = screen.getByTestId('dashboard-header-car');
    expect(car.type).toBe('RNSVGImage');
    expect(car.props).toMatchObject({ x: CAR_RECT.x, width: CAR_RECT.width, height: CAR_RECT.height, align: 'none' });
    // Left edge faded by its own mask, the top edge by the enclosing group's.
    expect(car.props.mask).toBe('carMaskLeft');
    expect(car.parent?.type).toBe('RNSVGGroup');
    expect(car.parent?.props.mask).toBe('carMaskTop');
    expect(screen.getByText('Welcome John!')).toBeTruthy();
  });

  it('the left fade ends before the car body (x ≈ 265) so only the black background fades', () => {
    expect(CAR_RECT.x + CAR_FADE.left).toBeLessThanOrEqual(265);
    expect(CAR_FADE.top).toBeGreaterThan(0);
  });

  it('glow ≈ the Figma blur (ellipse 138 @ 0.8, σ 177): soft Gaussian, peak ≈ 0.21 alpha, fades to 0', () => {
    const peak = GLOW_STOPS[0].opacity * 0.8; // headerGlow carries the 0.8
    expect(peak).toBeCloseTo(0.21, 2);
    for (let i = 1; i < GLOW_STOPS.length; i++) {
      expect(GLOW_STOPS[i].opacity).toBeLessThan(GLOW_STOPS[i - 1].opacity);
    }
    expect(GLOW_STOPS[GLOW_STOPS.length - 1].opacity).toBe(0);
  });
});
