import type { FC, InputHTMLAttributes } from 'react';
import { useId } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    change(value: string | number): void;
};
export const InputDefault: FC<InputProps> = ({ label, change, ...props }) => {
    const id = useId();

    return (
        <div>
            <label
                className="mb-3 block text-black dark:text-white"
                htmlFor={props.id ?? id}
            >
                {label}
                {props.required && <span className="text-meta-1">*</span>}
            </label>
            <input
                id={id}
                type="text"
                placeholder="Default Input"
                className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                onInput={(e) => change(e.currentTarget.value)}
                {...props}
            />
        </div>
    );
};
