import type { FC } from 'react';
import { useOutletContext } from 'react-router-dom';

import { OutletContextType } from '../../pages/DataTables/DataTables.tsx';
import {
    getSelectableFields,
    sortColumns,
} from '../../pages/DataTables/utils.ts';

type ViewItemProps = {
    tableName: string;
    data: Record<string, string | number>;
    pkKeys: string[];
};
export const ViewItem: FC<ViewItemProps> = ({ tableName, data, pkKeys }) => {
    const schemaData = useOutletContext<OutletContextType>();
    const selectableColumns = getSelectableFields(schemaData, tableName);

    return (
        <div className="p-6.5">
            {sortColumns(selectableColumns, pkKeys).map((colName) => (
                <div className="mb-4.5" key={colName}>
                    <div>{colName}</div>
                    <div>{String(data[colName])}</div>
                </div>
            ))}
        </div>
    );
};
