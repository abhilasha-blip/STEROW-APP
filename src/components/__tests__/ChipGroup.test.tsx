import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Providers } from '../../../test/render';
import ChipGroup from '../ChipGroup';

const OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
] as const;

function Harness({ onChange }: { onChange: jest.Mock }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Providers>
      <ChipGroup
        testID="fuel"
        label="Fuel Type"
        options={OPTIONS}
        value={value}
        onChange={v => {
          onChange(v);
          setValue(v);
        }}
      />
    </Providers>
  );
}

describe('ChipGroup', () => {
  it('is a labelled radio group with one radio per option, none selected', async () => {
    await render(<Harness onChange={jest.fn()} />);
    expect(screen.getByTestId('fuel').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByTestId('fuel').props.accessibilityLabel).toBe('Fuel Type');
    for (const o of OPTIONS) {
      const chip = screen.getByLabelText(o.label);
      expect(chip.props.accessibilityRole).toBe('radio');
      expect(chip.props.accessibilityState).toMatchObject({ checked: false });
    }
    expect(screen.queryByTestId('fuel-electric-check')).toBeNull();
  });

  it('selects one chip at a time and shows the check only on it', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('fuel-electric'));
    expect(onChange).toHaveBeenLastCalledWith('electric');
    expect(screen.getByTestId('fuel-electric').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('fuel-electric-check')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('fuel-diesel'));
    expect(onChange).toHaveBeenLastCalledWith('diesel');
    expect(screen.getByTestId('fuel-diesel').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('fuel-electric').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByTestId('fuel-electric-check')).toBeNull();
    expect(screen.getByTestId('fuel-diesel-check')).toBeTruthy();
  });
});
