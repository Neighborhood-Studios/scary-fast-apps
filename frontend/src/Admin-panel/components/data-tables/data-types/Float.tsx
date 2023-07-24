import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const FloatView = DefaultTypeView;

export const FloatEdit: FC<InputProps> = (props) => (
    <InputDefault
        {...props}
        type="number"
        placeholder="float value"
        onInput={(e) => {
            const value = e.currentTarget.value;
            if (value === '' || /^-?\d+\.?\d+?$/.test(value)) {
                const intValue = value === '' ? null : Number(value);
                props.change?.(intValue);
            }
        }}
    />
);
