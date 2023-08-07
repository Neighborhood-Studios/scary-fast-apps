import type { FC } from 'react';
import { DefaultTypeView } from './DefaultType.tsx';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';

export const JSONView: FC<InputProps> = ({ value, ...props }) => {
    let jsonString = '';
    try {
        jsonString = JSON.stringify(value);
    } catch (e) {
        //noop
    }
    return <DefaultTypeView {...props} value={jsonString} />;
};

export const JSONtEdit: FC<InputProps> = ({ value, ...props }) => {
    return (
        <InputDefault
            {...props}
            placeholder="json string"
            value={typeof value === 'string' ? value : JSON.stringify(value)}
            onInput={({ currentTarget: { value } }) => {
                let jsonValue = value;
                try {
                    jsonValue = JSON.parse(value);
                } catch (e) {
                    //noop
                }
                props.change(jsonValue || null);
            }}
        />
    );
};
