import type { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';
import { DefaultTypeView } from './DefaultType.tsx';

export const Int2vectorView: FC<InputProps> = ({ value, ...props }) => {
    let jsonString = '';
    try {
        jsonString = JSON.stringify(value);
    } catch (e) {
        //noop
    }
    return <DefaultTypeView {...props} value={jsonString} />;
};

export const Int2vectorEdit: FC<InputProps> = ({ ...props }) => {
    //value should be small int -32,768 to 32,767 (-2^15 to 2^15-1)
    return (
        <InputDefault
            {...props}
            placeholder="integer value"
            title="integer value in range -32,768 to 32,767"
            onInput={({ currentTarget: { value } }) => {
                const intValue = parseInt(value);
                if (value === '-') props.change(value);
                else if (value === '') {
                    props.change(null);
                } else if (
                    !isNaN(intValue) &&
                    intValue > -(2 ** 15) &&
                    intValue < 2 ** 15
                ) {
                    props.change(intValue.toString());
                }
            }}
        />
    );
};
