import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { MAX_UPLOAD_BYTES } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import type { UploadedFile } from '@/utils/uploadFile';
import { Providers } from '../../../test/render';
import FileUploadCard from '../FileUploadCard';

const u = strings.onboarding.upload;
const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedPick = pick as jest.MockedFunction<typeof pick>;

function Harness({ onChange, initial = null }: { onChange: jest.Mock; initial?: UploadedFile | null }) {
  const [value, setValue] = useState<UploadedFile | null>(initial);
  return (
    <Providers>
      <FileUploadCard
        testID="rc"
        label="Upload Vehicle RC"
        title="Upload RC image"
        value={value}
        onChange={f => {
          onChange(f);
          setValue(f);
        }}
      />
    </Providers>
  );
}

async function choose(option: 'gallery' | 'document') {
  await fireEvent.press(screen.getByTestId('rc-box-empty'));
  await fireEvent.press(await screen.findByTestId(`rc-source-${option}`));
}

beforeEach(() => {
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});

describe('FileUploadCard', () => {
  it('empty: label, title, the "JPEG, PNG, PDF. Upto 10 MB" hint and Browse File', async () => {
    await render(<Harness onChange={jest.fn()} />);
    expect(screen.getByText('Upload Vehicle RC')).toBeTruthy();
    expect(screen.getByText('Upload RC image')).toBeTruthy();
    expect(screen.getByText(u.hint)).toBeTruthy();
    expect(screen.getByText(u.browse)).toBeTruthy();
    expect(screen.getByLabelText(u.uploadA11y('Upload Vehicle RC'))).toBeTruthy();
  });

  it('Browse File offers camera, gallery and PDF', async () => {
    await render(<Harness onChange={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('rc-box-empty'));
    expect(await screen.findByText(strings.onboarding.photoSource.camera)).toBeTruthy();
    expect(screen.getByText(strings.onboarding.photoSource.gallery)).toBeTruthy();
    expect(screen.getByText(strings.onboarding.photoSource.document)).toBeTruthy();
  });

  it('a gallery image shows the preview with a remove button; X empties it again', async () => {
    const onChange = jest.fn();
    mockedLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///rc.jpg', type: 'image/jpeg', fileName: 'rc.jpg', fileSize: 2048 }],
    });
    await render(<Harness onChange={onChange} />);
    await choose('gallery');
    expect(await screen.findByTestId('rc-box-image')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith({ uri: 'file:///rc.jpg', name: 'rc.jpg', mimeType: 'image/jpeg', size: 2048 });

    await fireEvent.press(screen.getByLabelText(u.removeA11y('Upload Vehicle RC')));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('rc-box-empty')).toBeTruthy();
  });

  it('a PDF shows a file tile (name + size) instead of a preview', async () => {
    mockedPick.mockResolvedValueOnce([
      { uri: 'file:///rc.pdf', name: 'RC scan.pdf', type: 'application/pdf', size: 1.5 * 1024 * 1024 },
    ] as never);
    await render(<Harness onChange={jest.fn()} />);
    await choose('document');
    expect(await screen.findByTestId('rc-box-file')).toBeTruthy();
    expect(screen.getByText('RC scan.pdf')).toBeTruthy();
    expect(screen.getByText('1.5 MB')).toBeTruthy();
    expect(screen.queryByTestId('rc-box-image')).toBeNull();
  });

  it('rejects an unsupported type with an inline error and keeps the box empty', async () => {
    const onChange = jest.fn();
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///a.gif', type: 'image/gif', fileSize: 10 }] });
    await render(<Harness onChange={onChange} />);
    await choose('gallery');
    expect(await screen.findByText(u.unsupportedType)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('rc-box-empty')).toBeTruthy();
  });

  it('rejects a PDF over 10 MB inline; a valid pick clears the error', async () => {
    mockedPick
      .mockResolvedValueOnce([
        { uri: 'file:///big.pdf', name: 'big.pdf', type: 'application/pdf', size: MAX_UPLOAD_BYTES + 1 },
      ] as never)
      .mockResolvedValueOnce([{ uri: 'file:///ok.pdf', name: 'ok.pdf', type: 'application/pdf', size: 1 }] as never);
    await render(<Harness onChange={jest.fn()} />);
    await choose('document');
    expect(await screen.findByText(u.tooLarge)).toBeTruthy();

    await choose('document');
    await waitFor(() => expect(screen.queryByText(u.tooLarge)).toBeNull());
    expect(screen.getByText('ok.pdf')).toBeTruthy();
  });

  it('shows picker errors inline (e.g. a photo over 10 MB from the image picker)', async () => {
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///huge.jpg', fileSize: MAX_UPLOAD_BYTES + 1 }] });
    await render(<Harness onChange={jest.fn()} />);
    await choose('gallery');
    expect(await screen.findByText(strings.onboarding.photoSource.tooLarge)).toBeTruthy();
  });

  it('cancelling the document picker changes nothing', async () => {
    const onChange = jest.fn();
    mockedPick.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'OPERATION_CANCELED' }));
    await render(<Harness onChange={onChange} />);
    await choose('document');
    await waitFor(() => expect(mockedPick).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(u.unsupportedType)).toBeNull();
  });
});
