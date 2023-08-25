import type { FC } from 'react';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';

type DefaultTypeViewProps = {
    value: unknown;
    label?: string;
};
export const DefaultTypeView: FC<DefaultTypeViewProps> = ({ label, value }) => {
    return label ? (
        <div>
            <div>{label}</div>
            <div>{String(value)}</div>
        </div>
    ) : (
        <>{String(value)}</>
    );
};

export const DefaultTypeInput: FC<InputProps> = (props) => {
    return <InputDefault {...props} />;
};
