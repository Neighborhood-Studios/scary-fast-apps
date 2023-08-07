import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const FloatView = DefaultTypeView;

export const FloatEdit: FC<InputProps> = (props) => (
    <InputDefault
        {...props}
        type="number"
        placeholder="float value"
        step="any"
        onInput={({ currentTarget: { value } }) => {
            const floatValue = parseFloat(value);
            if (!isNaN(floatValue)) {
                props.change(floatValue);
            } else {
                props.change(value || null);
            }
        }}
    />
);
