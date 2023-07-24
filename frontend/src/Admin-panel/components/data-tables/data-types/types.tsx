import { ComponentType } from 'react';

import { StringEdit, StringView } from './String.tsx';
import { BooleanEdit, BooleanView } from './Boolean.tsx';
import { IntEdit, IntView } from './Int.tsx';
import { BitEdit, BitView } from './Bit.tsx';
import { FloatEdit, FloatView } from './Float.tsx';
import {
    DateEdit,
    DateView,
    TimeEdit,
    TimestampEdit,
    TimestampView,
    TimeView,
} from './date-time.tsx';

enum Types {
    Boolean = 'Boolean',
    Int = 'Int',
    String = 'String',
    bigint = 'bigint',
    Float = 'Float',
    numeric = 'numeric',
    bit = 'bit',
    date = 'date',
    timestamp = 'timestamp',
    timestamptz = 'timestamptz',
    time = 'time',
    timetz = 'timetz',
}

export function typeComponents(type: string | undefined): {
    ViewComponent: ComponentType<any>;
    EditComponent: ComponentType<any>;
} {
    switch (type) {
        case Types.Boolean:
            return {
                ViewComponent: BooleanView,
                EditComponent: BooleanEdit,
            };
        case Types.Int:
        case Types.bigint:
            return {
                ViewComponent: IntView,
                EditComponent: IntEdit,
            };
        case Types.Float:
        case Types.numeric:
            return {
                ViewComponent: FloatView,
                EditComponent: FloatEdit,
            };
        case Types.bit:
            return {
                ViewComponent: BitView,
                EditComponent: BitEdit,
            };
        case Types.date:
            return {
                ViewComponent: DateView,
                EditComponent: DateEdit,
            };
        case Types.timestamp:
        case Types.timestamptz: {
            return {
                ViewComponent: TimestampView,
                EditComponent: TimestampEdit,
            };
        }
        case Types.time:
        case Types.timetz: {
            return {
                ViewComponent: TimeView, //TimeView,
                EditComponent: TimeEdit,
            };
        }
        case Types.String:
        default:
            return {
                ViewComponent: StringView,
                EditComponent: StringEdit,
            };
    }
}
