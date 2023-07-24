import type { FC } from 'react';
import { useId } from 'react';

import { InputProps } from '../../forms/Inputs.tsx';
import { ReactComponent as CheckmarkSVG } from '../../../images/icon/icon-checked.svg';
import { FormInputComponent } from '../FormInputComponent.tsx';
import { Select } from '../../forms/Select.tsx';

enum boolValues {
    TRUE = 'true',
    FALSE = 'false',
}

export const BooleanView: FC<{ value: boolean; label?: string }> = ({
    label,
    value,
}) => {
    return (
        <div>
            {label && <div>{label}</div>}
            {value && (
                <div>
                    <CheckmarkSVG style={{ width: '1rem', height: '1rem' }} />
                </div>
            )}
        </div>
    );
};

export const BooleanEdit: FC<InputProps> = ({
    label,
    description,
    change,
    value,
    ...props
}) => {
    const id = useId();
    const onSelect = (value: string) => {
        switch (value) {
            case boolValues.TRUE:
                return change(true);
            case boolValues.FALSE:
                return change(false);
            default:
                return change(null);
        }
    };

    const options = [
        {
            label: 'True',
            value: boolValues.TRUE,
        },
        { label: 'False', value: boolValues.FALSE },
    ];
    return (
        <FormInputComponent
            label={label}
            description={description}
            required={props.required}
            inputId={id}
        >
            <Select
                id={id}
                name={props.name}
                required={props.required}
                disabled={props.disabled}
                value={value}
                onSelect={onSelect}
                options={options}
            />
        </FormInputComponent>
    );
};
