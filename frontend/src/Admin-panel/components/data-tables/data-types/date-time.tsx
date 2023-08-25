import { FC } from 'react';

import { DefaultTypeView } from './DefaultType.tsx';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';

const DateTimeInput: FC<InputProps> = (props) => (
    <InputDefault
        className="custom-input-date custom-input-date-1 w-full
            rounded border border-stroke bg-transparent
            py-3 px-5 pr-2.5 leading-[1.375] outline-none transition
            focus:border-primary active:border-primary
            dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        {...props}
    />
);
export const DateView: FC<InputProps> = ({ value, ...props }) => {
    const dateString = value && new Date(String(value)).toLocaleDateString();
    return <DefaultTypeView {...props} value={dateString} />;
};

export const DateEdit: FC<InputProps> = (props) => {
    return (
        <div className="relative z-20 bg-white dark:bg-form-input">
            <DateTimeInput
                {...props}
                type="date"
                onInput={({ currentTarget: { value } }) =>
                    props.change(value || null)
                }
            />
        </div>
    );
};
export const TimeView: FC<InputProps> = ({ value, ...props }) => {
    if (!value) return null;
    value = String(value);
    const withTZ = value.match(/[+-][^-+]+$/)?.[0];

    if (!withTZ)
        return <DefaultTypeView {...props} value={value.split('.')[0]} />;

    const isoDateTime = new Date().toISOString();
    const [isoDate] = isoDateTime.split('T');

    const valueISODate = [isoDate, value]
        .join('T')
        .replace(/([+-]\d{2})$/, '$100');

    const timeString = new Date(valueISODate).toLocaleTimeString();

    return <DefaultTypeView {...props} value={timeString} />;
};
export const TimeEdit: FC<InputProps & { tz?: boolean }> = ({
    tz,
    value,
    ...props
}) => {
    value = value ?? '';

    let timeStringValue;
    value = String(value);
    const withTZ = tz || value.match(/[+-][^-+]+$/)?.[0];
    if (!withTZ) timeStringValue = value.split('.')[0];
    else {
        const isoDateTimeString = new Date().toISOString();
        const isoDateString = isoDateTimeString.split('T')[0];

        const valueISODate = `${isoDateString}T${value}`.replace(
            /([+-]\d{2})$/,
            '$100'
        );

        timeStringValue = new Date(valueISODate).toLocaleTimeString();
    }

    return (
        <DateTimeInput
            {...props}
            type="time"
            value={timeStringValue}
            onInput={({ currentTarget: { value } }) => {
                if (value && withTZ) {
                    value += getLocalISOTZ();
                }
                props.change(value || null);
            }}
        />
    );
};
export const TimeEditTz: FC<InputProps> = ({ ...props }) => (
    <TimeEdit {...props} tz />
);

export const TimestampView: FC<InputProps> = ({ value, ...props }) => {
    const dateString = value && new Date(String(value)).toLocaleString();
    return <DefaultTypeView {...props} value={dateString} />;
};

export const TimestampEdit: FC<InputProps & { tz?: boolean }> = ({
    tz,
    value,
    ...props
}) => {
    const hasTZ = tz || /[+-][^T]+$/.test(String(value));
    let timestampString = '';
    if (value) {
        value = String(value);
        if (!hasTZ) value += 'Z';

        let date = new Date(value);
        date.setMilliseconds(0);
        if (hasTZ) {
            date = new Date(
                date.valueOf() - new Date().getTimezoneOffset() * 60 * 1e3
            );
        }

        timestampString = date.toISOString().replace('Z', '');
    }

    return (
        <DateTimeInput
            {...props}
            type="datetime-local"
            value={timestampString}
            onInput={({ currentTarget: { value } }) => {
                if (value && hasTZ) {
                    value += getLocalISOTZ();
                }
                props.change(value || null);
            }}
        />
    );
};
export const TimestampEditTz: FC<InputProps> = ({ ...props }) => (
    <TimestampEdit {...props} tz />
);

const getLocalISOTZ = () => {
    const localOffset = new Date().getTimezoneOffset();
    const isoOffsetDir = localOffset < 0 ? '+' : '-';
    const isoTZhr = Math.trunc(Math.abs(localOffset / 60))
        .toString()
        .padStart(2, '0');
    const isoTZmin = Math.abs(localOffset % 60)
        .toString()
        .padStart(2, '0');
    const isoTZ = `${isoOffsetDir}${isoTZhr}:${isoTZmin}`;
    return isoTZ;
};
