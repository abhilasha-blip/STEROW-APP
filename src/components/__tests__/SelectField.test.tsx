import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { strings } from '@/constants/strings';
import { theme } from '@/theme';
import { Providers } from '../../../test/render';
import SelectField, { SELECT_SEARCH_THRESHOLD, type SelectFieldProps } from '../SelectField';

/** The inner TextField is hidden from screen readers (the Pressable carries the label). */
const HIDDEN = { includeHiddenElements: true };

const few = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];
const many = Array.from({ length: SELECT_SEARCH_THRESHOLD + 1 }, (_, i) => ({
  value: `v${i}`,
  label: i === 3 ? 'Mahindra' : `Make ${i}`,
}));

async function renderSelect(props: Partial<SelectFieldProps> = {}) {
  const onChange = jest.fn();
  await render(
    <Providers>
      <SelectField testID="sel" label="Vehicle Make" options={few} value={null} onChange={onChange} {...props} />
    </Providers>,
  );
  return { onChange };
}

describe('SelectField', () => {
  it('shows the "Select" placeholder, then the selected label', async () => {
    await renderSelect();
    expect(screen.getByTestId('sel-input', HIDDEN).props.placeholder).toBe(strings.onboarding.select.placeholder);
    expect(screen.getByTestId('sel').props.accessibilityLabel).toBe('Vehicle Make, Select');
    await screen.rerender(
      <Providers>
        <SelectField testID="sel" label="Vehicle Make" options={few} value="b" onChange={jest.fn()} />
      </Providers>,
    );
    expect(screen.getByTestId('sel-input', HIDDEN).props.value).toBe('Beta');
  });

  it('opens a sheet titled with the label; a check marks the selected row; picking closes it', async () => {
    const { onChange } = await renderSelect({ value: 'a' });
    await fireEvent.press(screen.getByTestId('sel'));
    expect(await screen.findByTestId('sel-sheet')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Vehicle Make' })).toBeTruthy(); // the sheet title
    expect(screen.getByTestId('sel-option-a-check')).toBeTruthy();
    expect(screen.queryByTestId('sel-option-b-check')).toBeNull();
    expect(screen.queryByTestId('sel-search')).toBeNull(); // ≤ 8 options: no search

    await fireEvent.press(screen.getByTestId('sel-option-b'));
    expect(onChange).toHaveBeenCalledWith('b');
    await waitFor(() => expect(screen.queryByTestId('sel-sheet')).toBeNull());
  });

  it(`adds a search box for more than ${SELECT_SEARCH_THRESHOLD} options and filters by it`, async () => {
    await renderSelect({ options: many });
    await fireEvent.press(screen.getByTestId('sel'));
    await fireEvent.changeText(await screen.findByTestId('sel-search'), 'mahin');
    expect(screen.getByTestId('sel-option-v3')).toBeTruthy();
    expect(screen.queryByTestId('sel-option-v0')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('sel-search'), 'zzz');
    expect(screen.getByText(strings.onboarding.select.noResults)).toBeTruthy();
  });

  it('disabled: muted text, faded field, accessibilityState disabled', async () => {
    await renderSelect({ disabled: true, value: 'a' });
    const input = screen.getByTestId('sel-input', HIDDEN);
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toMatchObject({ disabled: true });
    expect(StyleSheet.flatten(input.props.style).color).toBe(theme.colors.text.onLightMuted);
    expect(StyleSheet.flatten(input.parent?.props.style)?.opacity).toBe(0.5);
  });

  it('does not open while disabled or loading', async () => {
    await renderSelect({ disabled: true });
    expect(screen.getByTestId('sel').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('sel'));
    expect(screen.queryByTestId('sel-sheet')).toBeNull();

    await screen.rerender(
      <Providers>
        <SelectField testID="sel" label="Vehicle Make" options={few} value={null} onChange={jest.fn()} loading />
      </Providers>,
    );
    expect(screen.getByTestId('sel-input-loading', HIDDEN)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sel'));
    expect(screen.queryByTestId('sel-sheet')).toBeNull();
  });
});
