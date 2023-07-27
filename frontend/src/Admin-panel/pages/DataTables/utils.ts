/* eslint-disable @typescript-eslint/no-non-null-assertion*/

import type {
    IntrospectionEnumType,
    IntrospectionField,
    IntrospectionInputObjectType,
    IntrospectionObjectType,
} from 'graphql/utilities';
import type { SchemaData } from './DataTables.tsx';
import { IntrospectionInputValue } from 'graphql/utilities/getIntrospectionQuery';

export const pkDelimiter = '-=|=-';
const insertMutationName = (name = '') => `insert_${name}_one`;
const deleteMutationName = (name = '') => `delete_${name}_by_pk`;
const updateMutationName = (name = '') => `update_${name}_by_pk`;
const aggregationQueryName = (name = '') => `${name}_aggregate`;

export function getTables(schemaData: SchemaData) {
    const { queryType, typesMap } = schemaData;
    const queryRoot = typesMap[queryType] as IntrospectionObjectType;

    const rootQueries = queryRoot.fields.filter(({ name, type }) => {
        return (
            typesMap[name] &&
            (type.kind === 'LIST' ||
                (type.kind === 'NON_NULL' && type.ofType.kind === 'LIST'))
        );
    });

    return rootQueries.map(({ name }) => typesMap[name]);
}

export function generateQueryForModel(
    schemaData: SchemaData,
    name = '',
    withPagination?: boolean
) {
    const model = schemaData.typesMap[name] as IntrospectionObjectType;

    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryField = queries.fields.find((query) => query.name === name);
    const aggregationQueryField = queries.fields.find(
        (query) => query.name === aggregationQueryName(name)
    );

    if (!model || !queryField) throw Error('no query for table');

    const columns = getSelectableFields(schemaData, name);
    const queryName = queryField.name;
    const aggregationName = aggregationQueryField?.name;

    if (!columns.length) throw Error('no fields to query');

    withPagination = (withPagination && !!aggregationName) ?? !!aggregationName;

    const countQuery =
        aggregationName && withPagination
            ? `${aggregationName} {
            aggregate {
                count
            }
        }`
            : '';
    let paginationVars = '';
    let paginationArgs = '';
    if (countQuery) {
        paginationVars = `($limit: Int, $offset: Int)`;
        paginationArgs = `(limit: $limit, offset: $offset)`;
    }

    const queryString = `
        query ${name}DataQuery ${paginationVars} {
            ${queryName} ${paginationArgs} {
                ${columns.join('\n')}
            }
            ${countQuery}
        }
    `;
    return {
        queryString,
        queryName,
        aggregationQueryName: aggregationName,
        columns,
    };
}

export function generateQueryByPk(
    schemaData: SchemaData,
    name = '',
    pks: Record<string, string | number>
) {
    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryByPk = queries.fields.find(
        (query) => query.name === `${name}_by_pk`
    );
    if (!queryByPk) throw Error('no query by pk');

    const columns = getSelectableFields(schemaData, name);

    const queryArgumentsString = queryByPk.args
        .map(({ name }) => `${name}: "${pks[name]}"`)
        .join(', ');

    const queryString = `
        query ${name}DataQueryByPk {
            ${queryByPk.name} (${queryArgumentsString}) {
                ${columns.join('\n')}
            }
        }
    `;
    return { queryString, queryName: queryByPk.name };
}

export function generateInsertMutation(schemaData: SchemaData, name: string) {
    const { typesMap, mutationType } = schemaData;
    if (!mutationType) throw Error('cannot mutate');

    const rootMutationType = typesMap[mutationType] as IntrospectionObjectType;

    const insertMutationType = rootMutationType.fields.find(
        (field) => field.name === insertMutationName(name)
    ) as IntrospectionField;
    const modelTypeModelName = getTypeName(insertMutationType);
    const model = modelTypeModelName && typesMap[modelTypeModelName];

    const insertArgumentName = 'object';

    const insertObjectArgumentInput = insertMutationType?.args.find(
        (arg) => arg.name === insertArgumentName
    );
    const insertObjectTypeName = getTypeName(insertObjectArgumentInput);

    const insertType = typesMap[
        insertObjectTypeName
    ] as IntrospectionInputObjectType;

    if (!insertType || !model) throw Error('');

    const inputFields = insertType.inputFields.map((field) => ({
        name: field.name,
        type: field.type.kind === 'SCALAR' ? field.type.name : '',
        varName: field.name.replaceAll(/[^a-z0-9]+/gi, ''),
    }));

    const columns = getSelectableFields(schemaData, name);

    const varsString = inputFields.map(
        ({ varName, type }) => `$${varName}:${type}`
    );
    const mutationArgs = `${insertArgumentName}: {${inputFields.map(
        ({ name, varName }) => `${name}:$${varName}`
    )}}`;

    const mutationName = insertMutationType.name;
    const mutationString = `
        mutation Insert_${model.name}_item(${varsString}) {
            ${mutationName}(${mutationArgs}) {
                ${columns.join('\n')}
            }
        }
    `;

    return { mutationString, mutationName, inputFields };
}

export function generateDeleteMutation(schemaData: SchemaData, name = '') {
    const { mutationType, typesMap } = schemaData;
    const rootMutationType = typesMap[mutationType!] as IntrospectionObjectType;

    const deleteMutation = rootMutationType?.fields.find(
        (field) => field.name === deleteMutationName(name)
    ) as IntrospectionField | undefined;

    if (!deleteMutation) throw Error('can not delete');

    const mutationName = deleteMutation.name;
    const args = deleteMutation.args.map((arg) => ({
        name: arg.name,
        type: getTypeName(arg),
        required: arg.type.kind === 'NON_NULL',
        varName: arg.name,
    }));

    const vars = args.map(
        ({ varName, type, required }) =>
            `$${varName}:${type}${required ? '!' : ''}`
    );
    const mutationArgs = args.map(({ name, varName }) => `${name}:$${varName}`);

    const mutationString = `
        mutation Delete_${name}(${vars}){
            ${mutationName}(${mutationArgs}) {
                ${args.map(({ name }) => `${name}`).join('\n')}
            }
        }
    `;

    return {
        mutationString,
        mutationName,
        args,
    };
}

export function generateUpdateMutation(schemaData: SchemaData, name = '') {
    const { typesMap, mutationType } = schemaData;
    if (!mutationType) throw Error('cannot mutate');

    const rootMutationType = typesMap[mutationType] as IntrospectionObjectType;

    const updateMutationType = rootMutationType.fields.find(
        (field) => field.name === updateMutationName(name)
    ) as IntrospectionField;
    const modelTypeModelName = getTypeName(updateMutationType);
    const model = modelTypeModelName && typesMap[modelTypeModelName];

    const updateArgumentName = '_set';
    const updatePksName = 'pk_columns';

    const setInputObjectArgument = updateMutationType?.args.find(
        (arg) => arg.name === updateArgumentName
    );
    const pksInputObjectArgument = updateMutationType?.args.find(
        (arg) => arg.name === updatePksName
    );

    const setInputObjectTypeName = getTypeName(setInputObjectArgument);
    const pksInputObjectTypeName = getTypeName(pksInputObjectArgument);

    const setType = typesMap[
        setInputObjectTypeName
    ] as IntrospectionInputObjectType;
    const pksType = typesMap[
        pksInputObjectTypeName
    ] as IntrospectionInputObjectType;

    if (!setType || !pksType || !model) throw Error('');

    const setFields = setType.inputFields.map((field) => ({
        name: field.name,
        type: field.type.kind === 'SCALAR' ? field.type.name : '',
        varName: field.name.replaceAll(/[^a-z0-9_]+/gi, ''),
    }));
    const pksFields = pksType.inputFields.map((field) => ({
        name: field.name,
        type: getTypeName(field) + '!',
        varName: 'pk_' + field.name.replaceAll(/[^a-z0-9_]+/gi, ''),
    }));

    const columns = getSelectableFields(schemaData, name);

    const varsString = [...pksFields, ...setFields].map(
        ({ varName, type }) => `$${varName}:${type}`
    );

    const pksArgs = `${updatePksName}: {${pksFields.map(
        ({ name, varName }) => `${name}:$${varName}`
    )}}`;
    const mutationArgs = `${updateArgumentName}: {${setFields.map(
        ({ name, varName }) => `${name}:$${varName}`
    )}}`;

    const mutationName = updateMutationType.name;
    const mutationString = `
        mutation Update_${model.name}_item(${varsString}) {
            ${mutationName}(${pksArgs}, ${mutationArgs}) {
                ${columns.join('\n')}
            }
        }
    `;
    return { mutationString, mutationName, pksFields, setFields };
}
export function getModelPrimaryKeys(schemaData: SchemaData, name: string) {
    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryByPk = queries.fields.find(
        (query) => query.name === `${name}_by_pk`
    );

    return queryByPk?.args.map(({ name }) => name) ?? [];
}

export function getFieldsForModel(schemaData: SchemaData, name: string) {
    const model = schemaData.typesMap[name] as IntrospectionObjectType;
    const fields = model.fields.map((field) => {
        let type;
        if (
            'ofType' in field.type &&
            field.type.ofType &&
            'name' in field.type.ofType
        ) {
            type = field.type.ofType.name;
        } else if ('name' in field.type) {
            type = field.type.name;
        }

        return {
            name: field.name,
            description: field.description ?? '',
            type: type,
            nullable: field.type.kind !== 'NON_NULL',
        };
    });
    const fieldsMap = fields.reduce<Record<string, (typeof fields)[0]>>(
        (map, field) => Object.assign(map, { [field.name]: field }),
        {}
    );
    return fieldsMap;
}

export function getEditableFieldsForModel(
    schemaData: SchemaData,
    name: string
) {
    const editableColumnsType = schemaData.typesMap[
        `${name}_update_column`
    ] as IntrospectionEnumType;

    return editableColumnsType?.enumValues.map(({ name }) => name) ?? [];
}

export function getSelectableFields(schemaData: SchemaData, name: string) {
    const selectableColumnsType = schemaData.typesMap[
        `${name}_select_column`
    ] as IntrospectionEnumType;

    return selectableColumnsType?.enumValues.map(({ name }) => name) ?? [];
}

export function sortColumns(_columns: string[], pks: string[] = []) {
    const columns = _columns.slice().sort();
    //to the beginning
    pks.sort()
        .reverse()
        .forEach((col) => {
            const colInd = columns.indexOf(col);
            if (colInd >= 0) {
                columns.splice(colInd, 1);
                columns.unshift(col);
            }
        });

    //to the end
    ['last_seen', 'updated_at', 'created_at'].forEach((col) => {
        const colInd = columns.indexOf(col);
        if (colInd >= 0) {
            columns.splice(colInd, 1);
            columns.push(col);
        }
    });

    return columns;
}

export function getCanEdit(schemaData: SchemaData, name = '') {
    const rootMutation = schemaData.typesMap[
        schemaData.mutationType!
    ] as IntrospectionObjectType;

    const updateColumns = schemaData.typesMap[
        `${name}_update_column`
    ] as IntrospectionEnumType;
    return (
        !!updateColumns?.enumValues.length &&
        !!rootMutation?.fields.find(
            (field) => field.name === updateMutationName(name)
        )
    );
}
export function getCanDelete(schemaData: SchemaData, name = '') {
    const rootMutation = schemaData.typesMap[
        schemaData.mutationType!
    ] as IntrospectionObjectType;

    return !!rootMutation?.fields.find(
        (field) => field.name === deleteMutationName(name)
    );
}
export function getCanInsert(schemaData: SchemaData, name = '') {
    const rootMutation = schemaData.typesMap[
        schemaData.mutationType!
    ] as IntrospectionObjectType;

    return !!rootMutation?.fields.find(
        (field) => field.name === insertMutationName(name)
    );
}

function getTypeName(
    objectType?: IntrospectionInputValue | IntrospectionField
) {
    let type = objectType?.type ?? null;
    let typeName: string | null = null;
    while (type) {
        typeName = 'name' in type ? type.name : null;
        type = 'ofType' in type ? type.ofType : null;
    }
    return typeName || '';
}
