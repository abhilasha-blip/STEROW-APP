import { decideStartRoute, type StartRouteInput } from '@/utils/startRoute';

const base: StartRouteInput = {
  hasDrivingLicense: false,
  vehicleCount: 0,
  dlSkipped: false,
  vehicleSkipped: false,
};

describe('decideStartRoute', () => {
  it.each<[string, Partial<StartRouteInput>, ReturnType<typeof decideStartRoute>]>([
    ['nothing done', {}, 'Step1Profile'],
    ['no DL but vehicles', { vehicleCount: 3 }, 'Step1Profile'],
    ['vehicle skipped but DL not done/skipped', { vehicleSkipped: true }, 'Step1Profile'],
    ['DL done, no vehicle', { hasDrivingLicense: true }, 'Step2Vehicle'],
    ['DL skipped, no vehicle', { dlSkipped: true }, 'Step2Vehicle'],
    ['DL done, vehicle skipped', { hasDrivingLicense: true, vehicleSkipped: true }, 'Dashboard'],
    ['DL skipped, vehicle skipped', { dlSkipped: true, vehicleSkipped: true }, 'Dashboard'],
    ['DL done, one vehicle', { hasDrivingLicense: true, vehicleCount: 1 }, 'Dashboard'],
    ['DL skipped, vehicles', { dlSkipped: true, vehicleCount: 2 }, 'Dashboard'],
  ])('%s', (_name, input, expected) => {
    expect(decideStartRoute({ ...base, ...input })).toBe(expected);
  });
});
