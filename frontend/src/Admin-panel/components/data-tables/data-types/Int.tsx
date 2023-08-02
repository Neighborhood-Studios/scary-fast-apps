import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const IntView = DefaultTypeView;

export const IntEdit: FC<InputProps> = (props) => (
    <InputDefault
        {...props}
        type="number"
        placeholder="integer value"
        step={1}
        onInput={({ currentTarget: { value } }) => {
            const intValue = parseInt(value);
            if (!isNaN(intValue)) {
                props.change(intValue);
            } else {
                props.change(value || null);
            }
        }}
    />
);
