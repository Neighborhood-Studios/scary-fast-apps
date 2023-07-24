import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const BitView: FC<InputProps> = ({ value, ...props }) => {
    const bitValue = value ?? '';
    return <DefaultTypeView value={bitValue} {...props} />;
};

export const BitEdit: FC<InputProps> = ({ value, ...props }) => {
    return (
        <InputDefault
            {...props}
            type="number"
            placeholder="integer value"
            onInput={({ currentTarget: { value } }) => {
                if (['', '0', '1'].includes(value)) props.change(value || null);
            }}
            value={value ?? ''}
        />
    );
};
