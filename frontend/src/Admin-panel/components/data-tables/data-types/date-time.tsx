import { FC } from 'react';

import { DefaultTypeView } from './DefaultType.tsx';
import { InputDefault, InputProps } from '../../forms/Inputs.tsx';

export const DateView: FC<InputProps> = ({ value, ...props }) => {
    const dateString = value && new Date(String(value)).toLocaleDateString();
    return <DefaultTypeView {...props} value={dateString} />;
};

export const DateEdit: FC<InputProps> = (props) => {
    return (
        <InputDefault
            {...props}
            type="date"
            className="custom-input-date custom-input-date-1 w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            onInput={({ currentTarget: { value } }) =>
                props.change(value || null)
            }
        />
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
export const TimeEdit: FC<InputProps> = ({ value, ...props }) => {
    if (!value) return null;

    let timeStringValue;
    value = String(value);
    const withTZ = value.match(/[+-][^-+]+$/)?.[0];

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
        <InputDefault
            {...props}
            type="time"
            value={timeStringValue}
            className="custom-input-date custom-input-date-1 w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            onInput={({ currentTarget: { value } }) => {
                if (value && withTZ) {
                    value += getLocalISOTZ();
                }
                props.change(value || null);
            }}
        />
    );
};

export const TimestampView: FC<InputProps> = ({ value, ...props }) => {
    const dateString = value && new Date(String(value)).toLocaleString();
    return <DefaultTypeView {...props} value={dateString} />;
};

export const TimestampEdit: FC<InputProps> = ({ value, ...props }) => {
    const hasTZ = /[+-][^T]+$/.test(String(value));
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
        <InputDefault
            {...props}
            type="datetime-local"
            value={timestampString}
            className="custom-input-date custom-input-date-1 w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
            onInput={({ currentTarget: { value } }) => {
                if (value && hasTZ) {
                    value += getLocalISOTZ();
                }
                props.change(value || null);
            }}
        />
    );
};

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
