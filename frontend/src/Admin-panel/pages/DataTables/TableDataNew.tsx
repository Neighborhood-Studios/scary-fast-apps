import type { FC, FormEventHandler } from 'react';
import { useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { gql, useMutation } from '@apollo/client';
import { generateInsertMutation, getFieldsForModel } from './utils.ts';
import { OutletContextType } from './DataTables.tsx';
import { ErrorMsg } from '../../components/alerts/ErrorMsg.tsx';
import { FieldEditComponent } from '../../components/data-tables/UpdateForm.tsx';

type TableDataNewProps = object;
export const TableDataNew: FC<TableDataNewProps> = () => {
    const schemaData = useOutletContext<OutletContextType>();
    const { name } = useParams<{ name: string }>();

    const { mutationString, /* mutationName,*/ inputFields } =
        generateInsertMutation(schemaData, name || '');

    const query = useMemo(() => gql(mutationString), [mutationString]);
    const [insert, { loading, error }] = useMutation(query);

    const modelFields = getFieldsForModel(schemaData, name || '');

    const [values, setValues] = useState<Record<string, string>>({});

    const update = (name: string) => (value: string) => {
        setValues((values) => ({ ...values, [name]: value }));
    };
    const formOnSubmit: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        insert({ variables: values })
            .then(() => {
                form.reset();
            })
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
                                    <FieldEditComponent
                                        colName={colName}
                                        value={values[varName] ?? null}
                                        colData={modelFields[colName]}
                                        updateField={update(varName)}
                                    />
                                </div>
                            ))}
                        </fieldset>

                        {error && (
                            <ErrorMsg title=" There was error with your submission">
                                {error.message}
                            </ErrorMsg>
                        )}

                        <button
                            className="flex w-full justify-center rounded bg-primary p-3 mt-4.5 font-medium text-gray disabled:opacity-50"
                            disabled={loading}
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
