import type { FC, InputHTMLAttributes } from 'react';
import { useId } from 'react';
import { FormInputComponent } from '../data-tables/FormInputComponent.tsx';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    description?: string;
    change(value: string | number | boolean | null): void;
};
export const InputDefault: FC<InputProps> = ({
    label,
    description,
    change,
    value,
    ...props
}) => {
    const id = useId();

    return (
        <FormInputComponent
            label={label}
            description={description}
            required={props.required}
            inputId={id}
        >
            <input
                id={id}
                type="text"
                placeholder="Default Input"
                className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                onInput={(e) => change?.(e.currentTarget.value)}
                value={value ?? ''}
                {...props}
            />
        </FormInputComponent>
    );
};
