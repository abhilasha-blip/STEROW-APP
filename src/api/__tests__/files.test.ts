const { readLocalFile } = jest.requireActual<typeof import('@/api/files')>('@/api/files');

describe('readLocalFile (real implementation; mocked globally elsewhere)', () => {
  it('reads the bytes of a local uri through fetch', async () => {
    const bytes = new ArrayBuffer(4);
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ arrayBuffer: async () => bytes } as Response);
    await expect(readLocalFile('file:///tmp/a.jpg')).resolves.toBe(bytes);
    expect(fetchSpy).toHaveBeenCalledWith('file:///tmp/a.jpg');
  });

  it('an unreadable file is an ApiError FILE_UNREADABLE', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(readLocalFile('file:///gone.jpg')).rejects.toMatchObject({ name: 'ApiError', code: 'FILE_UNREADABLE' });
  });
});
