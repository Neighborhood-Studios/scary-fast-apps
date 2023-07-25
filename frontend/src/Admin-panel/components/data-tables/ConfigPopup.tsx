import { FormEventHandler, forwardRef } from 'react';
import { useRecoilState } from 'recoil';

import { availablePageSizes } from 'constants';
import { tableConfigSelector } from 'Recoil/data-tables';

type ConfigPopupProps = {
    tableName: string;
    availableColumns: string[];
};
export const ConfigPopup = forwardRef<HTMLDivElement, ConfigPopupProps>(
    ({ tableName, availableColumns }, ref) => {
        const [tableConfig, setTableConfig] = useRecoilState(
            tableConfigSelector(tableName)
        );
        const itemsOnPage = tableConfig.itemsOnPage;
        const visibleColumns = tableConfig.visibleColumns ?? availableColumns;

        const updatePageSize: FormEventHandler<HTMLInputElement> = ({
            currentTarget: { value },
        }) =>
            setTableConfig((config) => ({
                ...config,
                itemsOnPage: +value,
            }));
        const updateEnabledColumns: FormEventHandler<HTMLInputElement> = ({
            currentTarget: { name, checked },
        }) =>
            setTableConfig((config) => {
                let visibleColumns = config.visibleColumns ?? availableColumns;
                if (checked) {
                    visibleColumns = visibleColumns.concat(name);
                } else {
                    visibleColumns = visibleColumns.filter(
                        (colName) => colName !== name
                    );
                }
                return {
                    ...config,
                    visibleColumns,
                };
            });

        return (
            <div
                ref={ref}
                className={`
                  p-3 
                  rounded-sm border border-stroke dark:border-strokedark
                  bg-white dark:bg-boxdark
                  shadow-default
                `}
            >
                <h5 className="font-semibold text-xl">
                    <i>{tableName}</i> preferences
                </h5>
                <div className="flex flex-row gap-3.5">
                    <div className="flex-grow">
                        <h6 className="font-semibold">Select page size:</h6>
                        <ul>
                            {availablePageSizes.map((pageSize) => (
                                <li
                                    key={pageSize}
                                    className="whitespace-nowrap"
                                >
                                    <label>
                                        <input
                                            type="radio"
                                            name="page-size"
                                            value={pageSize}
                                            defaultChecked={
                                                pageSize === itemsOnPage
                                            }
                                            onChange={updatePageSize}
                                        />{' '}
                                        {pageSize} items
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div
                        className="align-middle w-[1px] self-stretch"
                        style={{
                            background:
                                'linear-gradient(to bottom, transparent, #aeb7c0 20%, #aeb7c0 80%, transparent )',
                        }}
                    />
                    <div className="flex-grow">
                        <h6 className="font-semibold">Visible columns:</h6>
                        <ul>
                            {availableColumns.map((colName) => (
                                <li
                                    key={colName}
                                    className="flex flex-row justify-between"
                                >
                                    <label htmlFor={'col_' + colName}>
                                        {colName}
                                    </label>
                                    <input
                                        type="checkbox"
                                        name={colName}
                                        value={colName}
                                        id={'col_' + colName}
                                        disabled={
                                            visibleColumns.includes(colName) &&
                                            visibleColumns.length <= 1
                                        }
                                        defaultChecked={visibleColumns.includes(
                                            colName
                                        )}
                                        onChange={updateEnabledColumns}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
);
