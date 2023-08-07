import type { FC } from 'react';
import { useMemo } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useOutletContext } from 'react-router-dom';

import { OutletContextType } from '../../pages/DataTables/DataTables.tsx';
import { generateDeleteMutation } from '../../pages/DataTables/utils.ts';

import { DeleteSVG } from '../../images/actions';

type DeleteItemProps = {
    name: string;
    data: Record<string, object>;
    disabled: boolean;
    onDeleteStart(): void;
    onDeleteSuccess(): void;
    onDeleteError(): void;
};
export const DeleteItem: FC<DeleteItemProps> = ({
    name,
    data,
    disabled,
    onDeleteStart,
    onDeleteSuccess,
    onDeleteError,
}) => {
    const schemaData = useOutletContext<OutletContextType>();
    const {
        mutationString: mutationDeleteString,
        // mutationName,
        args: deleteArgs,
    } = generateDeleteMutation(schemaData, name);
    const deleteMutation = useMemo(
        () => gql(mutationDeleteString),
        [mutationDeleteString]
    );
    const [deleteItem] = useMutation(deleteMutation);

    const onDeleteItem = () => {
        const confirmResult = confirm('delete item?');
        if (confirmResult) {
            const variables = deleteArgs.reduce(
                (variables, { name, varName }) =>
                    Object.assign(variables, { [varName]: data[name] }),
                {}
            );
            onDeleteStart();
            deleteItem({ variables })
                .then(onDeleteSuccess)
                .catch(onDeleteError);
        }
    };

    return (
        <button
            title="delete row"
            className="hover:text-primary"
            onClick={onDeleteItem}
            disabled={disabled}
        >
            <DeleteSVG />
        </button>
    );
};
