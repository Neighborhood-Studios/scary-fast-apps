import type { FC, MouseEventHandler } from 'react';
import type { IntrospectionInputValue } from 'graphql/utilities/getIntrospectionQuery';
//
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { get } from 'lodash';

import { OutletContextType } from '../../pages/DataTables/DataTables.tsx';
import {
    getFieldsForModel,
    getSelectableFields,
    getTypeName,
} from '../../pages/DataTables/utils.ts';
import { typeComponents } from './data-types/types.tsx';
import { Select } from '../forms/Select.tsx';
import { ReactComponent as DeleteSVG } from '../../images/actions/delete.svg';
import { CrossmarkSVG } from '../../images/icon';

type FilterPopupProps = {
    tableName: string;
    currentConfig: FilterItemData[];
    onFilterChange(filterData: FilterItemData[]): void;
    close(): void;
};

export const FilterPopup = forwardRef<HTMLDivElement, FilterPopupProps>(
    ({ tableName, currentConfig, onFilterChange, close }, ref) => {
        const schemaData = useOutletContext<OutletContextType>();
        const tableFields = getFieldsForModel(schemaData, tableName);
        const selectableFields = getSelectableFields(schemaData, tableName);
        const [filtersData, setFiltersData] =
            useState<(Partial<FilterItemData> & { id: number })[]>(
                currentConfig
            );

        useEffect(() => setFiltersData(currentConfig), [currentConfig]);

        const fieldsList = selectableFields.filter(
            (fieldName) => tableFields[fieldName]
        );
        const operatorsByType = fieldsList.reduce<
            Record<string, { operator: string; opType: string }[]>
        >((opMap, fieldName) => {
            const type = tableFields[fieldName].type;
            if (!type || opMap[type]) {
                return opMap;
            }
            const operators = get(
                schemaData.typesMap,
                [`${type}_comparison_exp`, 'inputFields'],
                []
            ).map((operator: IntrospectionInputValue) => ({
                operator: operator.name,
                opType: getTypeName(operator),
            }));
            return { ...opMap, [type]: operators };
        }, {});

        const getOperatorsForField = (fieldName: string | undefined) =>
            fieldName && tableFields[fieldName].type
                ? operatorsByType[String(tableFields[fieldName].type)]
                : [];

        const addFilterItem = () => {
            setFiltersData((data) => [...data, { id: filtersData.length }]);
        };
        const updateFilterItem =
            (id: number) => (updData: Omit<FilterItemData, 'id'>) => {
                setFiltersData((data) =>
                    data.map((fData) =>
                        fData.id === id ? { ...fData, ...updData } : fData
                    )
                );
            };
        const deleteFilterItem = (id: number) => () => {
            setFiltersData((data) => data.filter((fData) => fData.id !== id));
        };

        const submitFilters: MouseEventHandler = () => {
            const parsedData = filtersData.filter(function (
                filterItem
            ): filterItem is FilterItemData {
                return (
                    filterItem.field != null &&
                    filterItem.operator != null &&
                    filterItem.value != null &&
                    filterItem.value !== ''
                );
            });
            onFilterChange(parsedData);
            close();
        };
        const resetFilters = () => {
            onFilterChange([]);
            close();
        };
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
                <div className="flex flex-row justify-between">
                    <h5 className="font-semibold text-xl">
                        <i>{tableName}</i> filters
                    </h5>
                    <span className="p-[0.2]" role="button" onClick={close}>
                        <CrossmarkSVG />
                    </span>
                </div>
                <div>
                    <ul>
                        {filtersData.map((filterItem) => (
                            <li key={filterItem.id}>
                                <FilterItem
                                    filterData={filterItem}
                                    fieldsList={fieldsList}
                                    operators={getOperatorsForField(
                                        filterItem.field
                                    )}
                                    updateFilterItem={updateFilterItem(
                                        filterItem.id
                                    )}
                                    deleteFilterItem={deleteFilterItem(
                                        filterItem.id
                                    )}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <span role="button" onClick={addFilterItem}>
                        + Add
                    </span>
                </div>
                <div className="flex justify-end gap-4.5">
                    <button
                        className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                    <button
                        className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:shadow-1"
                        onClick={submitFilters}
                    >
                        Save
                    </button>
                </div>
            </div>
        );
    }
);

const FilterItem: FC<{
    filterData: Partial<FilterItemData>;
    updateFilterItem(upData: Partial<Omit<FilterItemData, 'id'>>): void;
    deleteFilterItem(): void;
    fieldsList: string[];
    operators: { operator: string; opType: string }[];
}> = ({
    filterData,
    fieldsList,
    operators,
    updateFilterItem,
    deleteFilterItem,
}) => {
    const update = useRef(updateFilterItem);
    update.current = updateFilterItem;

    const getOpType = useCallback(
        (operatorName: string | undefined) =>
            operatorName &&
            operators.find(({ operator }) => operator === operatorName)?.opType,
        [operators]
    );

    const prevTypeRef = useRef<string>();
    const opType = getOpType(filterData.operator);

    //handle opType change
    useEffect(() => {
        const prevType = prevTypeRef.current;
        if (prevType && prevType !== opType) {
            //reset value on type change
            update.current({ opType, value: undefined });
        } else {
            update.current({ opType });
        }

        return () => {
            prevTypeRef.current = opType;
        };
    }, [opType, prevTypeRef, update]);

    const updateOption = (name: string) => (value: string) =>
        updateFilterItem({ [name]: value });

    const updateValue = (value: string | boolean | number) =>
        updateFilterItem({ value: value });

    const EditComponent = opType && typeComponents(opType).EditComponent;

    return (
        <div className="flex flex-row items-center gap-3 mb-4.5">
            <Select
                name="field"
                value={filterData.field}
                onSelect={updateOption('field')}
                options={fieldsList.map((name) => ({
                    label: name,
                    value: name,
                }))}
                required
            />
            <Select
                name="operator"
                value={filterData.operator}
                onSelect={updateOption('operator')}
                options={operators.map(({ operator }) => ({
                    label: operator,
                    value: operator,
                }))}
                required
            />
            {EditComponent && (
                <EditComponent
                    name="value"
                    value={filterData.value}
                    change={updateValue}
                    required
                />
            )}
            <span
                role="button"
                onClick={deleteFilterItem}
                className="p-[0.2em]"
            >
                <DeleteSVG />
            </span>
        </div>
    );
};
