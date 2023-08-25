import type { FC } from 'react';
import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import type { OutletContextType } from '../../pages/DataTables/DataTables.tsx';
import { DeleteItem } from './DeleteItem.tsx';
import {
    getFieldsForModel,
    pkDelimiter,
} from '../../pages/DataTables/utils.ts';
import { EditSVG, ViewSVG } from '../../images/actions';
import { typeComponents } from './data-types/types.tsx';

type DataRowProps = {
    tableName: string;
    rowData: Record<string, object>;
    columns: string[];
    primaryKeys: string[];
    canEdit?: boolean;
    canDelete?: boolean;
    refetch(): void;
};
export const DataRow: FC<DataRowProps> = ({
    tableName,
    rowData,
    columns,
    primaryKeys,
    canEdit,
    canDelete,
    refetch,
}) => {
    const schemaData = useOutletContext<OutletContextType>();
    const modelFields = getFieldsForModel(schemaData, tableName || '');

    const [isDeleting, setIsDeleting] = useState(false);

    return (
        <tr className={isDeleting ? 'opacity-50' : ''}>
            <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                <div className="flex flex-row flex-nowrap gap-2 align-middle">
                    {canDelete && (
                        <DeleteItem
                            name={tableName}
                            data={rowData}
                            onDeleteError={() => {
                                setIsDeleting(false);
                            }}
                            onDeleteSuccess={refetch}
                            onDeleteStart={() => setIsDeleting(true)}
                            disabled={isDeleting}
                        />
                    )}

                    <Link
                        className="leading-[0px] hover:text-primary"
                        to={primaryKeys
                            .map((pk) => rowData[pk])
                            .join(pkDelimiter)}
                    >
                        {canEdit ? (
                            <EditSVG title="edit row" />
                        ) : (
                            <ViewSVG title="view row" />
                        )}
                    </Link>
                </div>
            </td>
            {columns.map((colName) => (
                <td
                    className="border-b border-[#eee] py-5 px-4 dark:border-strokedark"
                    key={colName}
                >
                    <div className="text-black dark:text-white">
                        {renderColumnValue(
                            modelFields[colName],
                            rowData[colName]
                        )}
                    </div>
                </td>
            ))}
        </tr>
    );
};

function renderColumnValue(
    colData: ReturnType<typeof getFieldsForModel>[string],
    value: unknown
) {
    const { ViewComponent } = typeComponents(colData.type);
    return <ViewComponent value={value} />;
}
