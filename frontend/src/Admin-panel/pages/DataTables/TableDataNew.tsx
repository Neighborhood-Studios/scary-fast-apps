import type { FC, FormEventHandler } from 'react';
import { useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { gql, useMutation } from '@apollo/client';
import {
    generateInsertMutation,
    getEditableFieldsForModel,
    getFieldsForModel,
} from './utils.ts';
import { OutletContextType } from './DataTables.tsx';
import { InputDefault } from '../../components/forms/Inputs.tsx';

type TableDataNewProps = object;
export const TableDataNew: FC<TableDataNewProps> = () => {
    const schemaData = useOutletContext<OutletContextType>();
    const { name } = useParams<{ name: string }>();

    const { mutationString, mutationName, inputFields } =
        generateInsertMutation(schemaData, name || '');

    const query = useMemo(() => gql(mutationString), [mutationString]);
    const [insert, { data, loading, error }] = useMutation(query);

    const modelFields = getFieldsForModel(schemaData, name || '');
    const editableColumns = getEditableFieldsForModel(schemaData, name || '');

    const [values, setValues] = useState<Record<string, string>>({});

    const update = (name: string) => (value: string) => {
        setValues((values) => ({ ...values, [name]: value }));
    };
    const formOnSubmit: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        insert({ variables: values })
            .then(console.log.bind(console, 'gql result'))
            .catch(console.warn.bind(console, 'gql error'));
    };

    return (
        <div className="flex flex-col gap-9">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">
                        Add new <i>{name}</i> item
                    </h3>
                </div>
                <form action="" onSubmit={formOnSubmit}>
                    <div className="p-6.5">
                        <fieldset disabled={loading}>
                            {inputFields.map(({ name: colName, varName }) => (
                                <div className="mb-4.5" key={colName}>
                                    <InputDefault
                                        label={colName}
                                        name={colName}
                                        defaultValue={''}
                                        required={
                                            editableColumns.includes(colName) &&
                                            !modelFields[colName].nullable
                                        }
                                        onInput={(e) =>
                                            update(varName)(
                                                e.currentTarget.value
                                            )
                                        }
                                    />
                                </div>
                            ))}
                        </fieldset>
                        <button className="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray">
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
