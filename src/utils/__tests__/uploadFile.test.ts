import { MAX_UPLOAD_BYTES } from '@/constants/onboarding';
import { formatFileSize, isPdf, resolveMimeType, validateUpload } from '../uploadFile';

describe('resolveMimeType', () => {
  it('accepts jpeg / png / pdf by reported type (image/jpg normalised)', () => {
    expect(resolveMimeType({ uri: 'x', type: 'image/jpeg' })).toBe('image/jpeg');
    expect(resolveMimeType({ uri: 'x', type: 'IMAGE/JPG' })).toBe('image/jpeg');
    expect(resolveMimeType({ uri: 'x', type: 'image/png' })).toBe('image/png');
    expect(resolveMimeType({ uri: 'x', type: 'application/pdf' })).toBe('application/pdf');
  });

  it('rejects other reported types even with an allowed extension', () => {
    expect(resolveMimeType({ uri: 'file:///a.jpg', type: 'image/heic' })).toBeNull();
    expect(resolveMimeType({ uri: 'x', type: 'image/webp' })).toBeNull();
  });

  it('falls back to the file name, then the uri extension', () => {
    expect(resolveMimeType({ uri: 'content://1', fileName: 'RC.PDF' })).toBe('application/pdf');
    expect(resolveMimeType({ uri: 'file:///tmp/photo.jpeg?x=1' })).toBe('image/jpeg');
    expect(resolveMimeType({ uri: 'file:///tmp/notes.txt' })).toBeNull();
    expect(resolveMimeType({ uri: 'content://no-extension' })).toBeNull();
  });
});

describe('validateUpload', () => {
  it('returns the normalised file for an allowed type within 10 MB', () => {
    expect(
      validateUpload({ uri: 'file:///a/rc.png', fileName: 'rc.png', type: 'image/png', fileSize: 2048 }),
    ).toEqual({ ok: true, file: { uri: 'file:///a/rc.png', name: 'rc.png', mimeType: 'image/png', size: 2048 } });
  });

  it('accepts exactly 10 MB and rejects anything larger', () => {
    const base = { uri: 'file:///a/rc.pdf', type: 'application/pdf' };
    expect(validateUpload({ ...base, fileSize: MAX_UPLOAD_BYTES }).ok).toBe(true);
    expect(validateUpload({ ...base, fileSize: MAX_UPLOAD_BYTES + 1 })).toEqual({ ok: false, error: 'too_large' });
  });

  it('rejects unsupported types before checking the size', () => {
    expect(validateUpload({ uri: 'file:///a.gif', type: 'image/gif', fileSize: MAX_UPLOAD_BYTES * 2 })).toEqual({
      ok: false,
      error: 'unsupported_type',
    });
  });

  it('names the file from the uri when the picker gives no name, and omits an unknown size', () => {
    const result = validateUpload({ uri: 'file:///tmp/My%20RC.jpg' });
    expect(result).toEqual({ ok: true, file: { uri: 'file:///tmp/My%20RC.jpg', name: 'My RC.jpg', mimeType: 'image/jpeg' } });
  });

  it('keeps a malformed percent-encoded name as is', () => {
    const result = validateUpload({ uri: 'file:///tmp/100%.png' });
    expect(result.ok && result.file.name).toBe('100%.png');
  });
});

describe('formatFileSize / isPdf', () => {
  it('formats KB and MB', () => {
    expect(formatFileSize(100)).toBe('1 KB');
    expect(formatFileSize(820 * 1024)).toBe('820 KB');
    expect(formatFileSize(1.44 * 1024 * 1024)).toBe('1.4 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('detects PDFs', () => {
    expect(isPdf({ mimeType: 'application/pdf' })).toBe(true);
    expect(isPdf({ mimeType: 'image/png' })).toBe(false);
  });
});
