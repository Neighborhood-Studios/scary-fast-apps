import { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';

export const UUIDEdit: FC<InputProps> = (props) => (
    <InputDefault
        {...props}
        type="text"
        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
        pattern="^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$"
        onInput={({ currentTarget: { value } }) => props.change(value || null)}
    />
);
