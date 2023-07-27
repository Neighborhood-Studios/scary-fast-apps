import type { FC, FormEventHandler } from 'react';
import { useMemo, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useOutletContext } from 'react-router-dom';
import {
    generateUpdateMutation,
    getEditableFieldsForModel,
    getFieldsForModel,
    getSelectableFields,
    sortColumns,
} from '../../pages/DataTables/utils.ts';

import { OutletContextType } from '../../pages/DataTables/DataTables.tsx';
import { ErrorMsg } from '../alerts/ErrorMsg.tsx';
import { SuccessMsg } from '../alerts/SuccessMsg.tsx';
import { typeComponents } from './data-types/types.tsx';

type UpdateFormProps = {
    tableName: string;
    initialData: Record<string, string | number>;
};
export const UpdateForm: FC<UpdateFormProps> = ({ tableName, initialData }) => {
    const schemaData = useOutletContext<OutletContextType>();
    const [data, setData] = useState(initialData);
    const [values, setValues] = useState<Record<string, string | number>>({
        ...initialData,
    });

    const { mutationString, mutationName, pksFields, setFields } =
        generateUpdateMutation(schemaData, tableName);

    const pkKeys = pksFields.map(({ name }) => name);
    const mutation = useMemo(() => gql(mutationString), [mutationString]);
    const [update, { data: resultData, loading, error }] =
        useMutation(mutation);

    const modelFields = getFieldsForModel(schemaData, tableName);
    const selectableColumns = getSelectableFields(schemaData, tableName);
    const editableColumns = getEditableFieldsForModel(schemaData, tableName);

    const updateField = (name: string) => (value: string) => {
        setValues((values) => ({ ...values, [name]: value }));
    };

    const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        const variables = {};
        pksFields.forEach(({ name, varName }) =>
            Object.assign(variables, { [varName]: data[name] })
        );
        setFields.forEach(({ name, varName }) =>
            Object.assign(variables, { [varName]: values[name] ?? data[name] })
        );
        update({ variables }).then(({ data }) => {
            setData(data[mutationName]);
        });
    };

    return (
        <form action="" onSubmit={onSubmit}>
            <fieldset className="p-6.5 disabled:opacity-50" disabled={loading}>
                {sortColumns(selectableColumns, pkKeys).map((colName) => (
                    <div className="mb-4.5" key={colName}>
                        <FieldEditComponent
                            colName={colName}
                            value={values[colName]}
                            colData={modelFields[colName]}
                            disabled={!editableColumns.includes(colName)}
                            updateField={updateField(colName)}
                        />
                    </div>
                ))}
            </fieldset>
            {error && <ErrorMsg title="Update Error">{error.message}</ErrorMsg>}
            {resultData && <SuccessMsg title="Successful Update"></SuccessMsg>}
            <button
                className="flex w-full justify-center rounded bg-primary p-3 mt-4.5 font-medium text-gray disabled:opacity-50"
                disabled={loading}
            >
                Submit
            </button>
        </form>
    );
};

export const FieldEditComponent: FC<{
    colName: string;
    colData: ReturnType<typeof getFieldsForModel>[string];
    value: unknown;
    disabled?: boolean;
    updateField(newVal: unknown): void;
}> = ({ colName, value, colData, updateField, disabled }) => {
    const { EditComponent } = typeComponents(colData.type);

    return (
        <EditComponent
            label={colName}
            description={colData.description}
            name={colName}
            value={value}
            change={updateField}
            disabled={disabled}
            required={!disabled && !colData.nullable}
        />
    );
};
