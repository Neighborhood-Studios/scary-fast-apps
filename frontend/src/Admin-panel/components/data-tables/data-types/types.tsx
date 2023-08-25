/* eslint-disable @typescript-eslint/no-explicit-any */
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
    TimeEditTz,
    TimestampEdit,
    TimestampEditTz,
    TimestampView,
    TimeView,
} from './date-time.tsx';
import { UUIDEdit } from './uuid.tsx';
import { JSONtEdit, JSONView } from './json.tsx';
import { Int2vectorEdit, Int2vectorView } from './int2vector.tsx';

export enum Types {
    Boolean = 'Boolean',
    Int = 'Int',
    String = 'String',
    bigint = 'bigint',
    Float = 'Float',
    numeric = 'numeric',
    bit = 'bit',
    uuid = 'uuid',
    jsonb = 'jsonb',
    json = 'json',
    int2vector = 'int2vector',
    date = 'date',
    timestamp = 'timestamp',
    timestamptz = 'timestamptz',
    time = 'time',
    timetz = 'timetz',
    bpchar = 'bpchar',
    name = 'name',
}
export const stringTypes = [Types.String, Types.bpchar, Types.name] as string[];
export const numberTypes = [
    Types.Int,
    Types.bigint,
    Types.numeric,
    Types.Float,
] as string[];

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
        case Types.timestamp: {
            return {
                ViewComponent: TimestampView,
                EditComponent: TimestampEdit,
            };
        }
        case Types.timestamptz: {
            return {
                ViewComponent: TimestampView,
                EditComponent: TimestampEditTz,
            };
        }
        case Types.time: {
            return {
                ViewComponent: TimeView,
                EditComponent: TimeEdit,
            };
        }
        case Types.timetz: {
            return {
                ViewComponent: TimeView,
                EditComponent: TimeEditTz,
            };
        }
        case Types.json:
        case Types.jsonb: {
            return {
                ViewComponent: JSONView,
                EditComponent: JSONtEdit,
            };
        }
        case Types.uuid: {
            return {
                ViewComponent: StringView,
                EditComponent: UUIDEdit,
            };
        }
        case Types.int2vector: {
            return {
                ViewComponent: Int2vectorView,
                EditComponent: Int2vectorEdit,
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
