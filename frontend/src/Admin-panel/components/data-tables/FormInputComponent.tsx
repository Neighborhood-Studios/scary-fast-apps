import type { FC, PropsWithChildren } from 'react';

type FormInputComponentProps = PropsWithChildren<{
    label: string;
    description?: string;
    inputId?: string;
    required?: boolean;
}>;
export const FormInputComponent: FC<FormInputComponentProps> = ({
    label,
    description,
    required,
    inputId,
    children,
}) => {
    return (
        <div>
            {label && (
                <div className={description ? 'mb-1.5' : 'mb-3'}>
                    <label
                        className="block text-black dark:text-white"
                        htmlFor={inputId}
                    >
                        {label}
                        {required && <span className="text-meta-1">*</span>}
                    </label>
                    {description && (
                        <span className="relative top-[-0.5em] text-sm">
                            {description}
                        </span>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};
