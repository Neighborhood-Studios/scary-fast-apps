import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const IntView = DefaultTypeView;

export const IntEdit: FC<InputProps> = (props) => (
    <InputDefault
        {...props}
        type="number"
        placeholder="integer value"
        onInput={(e) => {
            const value = e.currentTarget.value;
            if (value === '' || /^-?\d+$/.test(value)) {
                const intValue = value === '' ? null : Number(value);
                props.change?.(intValue);
            }
        }}
    />
);
