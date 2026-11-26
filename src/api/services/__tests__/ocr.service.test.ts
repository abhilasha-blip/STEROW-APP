import { delay, http, HttpResponse } from 'msw';
import { __resetAppClientForTests } from '@/api/appClient';
import { ocrService } from '@/api/services/ocr.service';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { __setFeatureFlagsForTests } from '@/config/features';
import { makeSession, ocrFixtures } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

const JPG = { uri: 'file:///tmp/dl.jpg', mimeType: 'image/jpeg', name: 'dl.jpg' };
/** The 8 zero bytes the global readLocalFile mock returns. */
const DATA_URL = 'data:image/jpeg;base64,AAAAAAAAAAA=';

const reply = (url: string, body: object, status = 200) =>
  server.use(
    http.post(url, async ({ request }) => {
      requestLog.push({ url: request.url, method: 'POST', body: await request.clone().json(), headers: request.headers });
      return HttpResponse.json(body, { status });
    }),
  );

beforeEach(async () => {
  __resetSupabaseForTests();
  __resetAppClientForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
  __setFeatureFlagsForTests({ OCR_ENABLED: true });
});
afterEach(() => __setFeatureFlagsForTests());

describe('ocrService.read', () => {
  it('flag off (default): "unavailable", nothing is sent', async () => {
    __setFeatureFlagsForTests();
    expect(ocrService.isAvailable('dl')).toBe(false);
    await expect(ocrService.read('dl', JPG)).resolves.toEqual({ status: 'unavailable' });
    await expect(ocrService.read('insurance', JPG)).resolves.toEqual({ status: 'unavailable' });
    expect(requestLog.filter(r => r.url.includes('/ocr/'))).toEqual([]);
  });

  it('DL success: POST /ocr/driving-license { image: data URL } with the Bearer; normalised fields', async () => {
    reply(urls.ocrDrivingLicense, ocrFixtures.dlFull);
    await expect(ocrService.read('dl', JPG)).resolves.toEqual({
      status: 'ok',
      fields: { dlNumber: 'TS01 2011 0012345', issuedOn: '2020-01-15', validUpto: '2040-01-14' },
    });
    const call = requestLog.find(r => r.url === urls.ocrDrivingLicense)!;
    expect(call.body).toEqual({ image: DATA_URL });
    expect(call.headers.get('authorization')).toMatch(/^Bearer /);
  });

  it('documents: POST /ocr/document { table, image }; RC fields from the table columns', async () => {
    reply(urls.ocrDocument, ocrFixtures.rc);
    const r = await ocrService.read('rc', { ...JPG, mimeType: 'image/png' });
    expect(r).toEqual({
      status: 'ok',
      fields: {
        registrationNumber: 'TS09 EV 2345',
        regDate: '2023-03-20',
        validUpto: '2038-03-20',
        makeModel: 'MG ZS EV',
        fuelType: 'electric',
        chassisNumber: 'MZ1AB2CD3EF456789',
        engineNumber: 'EN12345',
        colour: 'Starry Black',
      },
    });
    expect(requestLog.find(r2 => r2.url === urls.ocrDocument)?.body).toEqual({
      table: 'vdocs_regcertificate',
      image: 'data:image/png;base64,AAAAAAAAAAA=',
    });
  });

  it('partial: only the non-empty values come back', async () => {
    reply(urls.ocrDrivingLicense, ocrFixtures.dlPartial);
    await expect(ocrService.read('dl', JPG)).resolves.toEqual({ status: 'ok', fields: { dlNumber: 'TS0120110012345' } });
  });

  it.each([
    ['"could not read" error', ocrFixtures.couldNotRead, 400, 'unreadable'],
    ['nothing read', ocrFixtures.empty, 200, 'empty'],
    ['low confidence', ocrFixtures.lowConfidence, 200, 'lowConfidence'],
    ['server error', { error: { code: 'internal', message: 'boom' } }, 500, 'error'],
  ] as const)('failure: %s → failed (%s)', async (_label, body, status, reason) => {
    reply(urls.ocrDrivingLicense, body, status);
    await expect(ocrService.read('dl', JPG)).resolves.toEqual({ status: 'failed', reason });
  });

  it('timeout → failed (timeout), never thrown', async () => {
    server.use(
      http.post(urls.ocrDocument, async () => {
        await delay(200);
        return HttpResponse.json(ocrFixtures.insurance);
      }),
    );
    await expect(ocrService.read('insurance', JPG, { timeoutMs: 20 })).resolves.toEqual({ status: 'failed', reason: 'timeout' });
  });
});
