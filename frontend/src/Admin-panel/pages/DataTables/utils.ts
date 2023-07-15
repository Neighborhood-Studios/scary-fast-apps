import type {
    IntrospectionEnumType,
    IntrospectionField,
    IntrospectionInputObjectType,
    IntrospectionObjectType,
} from 'graphql/utilities';
import type { SchemaData } from './DataTables.tsx';

export const pkDelimiter = '-=|=-';
const insertMutationName = (name = '') => `insert_${name}_one`;
const deleteMutationName = (name = '') => `delete_${name}_by_pk`;
const updateMutationName = (name = '') => `update_${name}_by_pk`;

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

export function generateQueryForModel(schemaData: SchemaData, name = '') {
    const model = schemaData.typesMap[name] as IntrospectionObjectType;

    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryField = queries.fields.find((query) => query.name === name);

    if (!model || !queryField) throw Error('no query for table');

    const columns = getSelectableFields(schemaData, name);

    if (!columns.length) throw Error('no fields to query');
    const queryString = `
        query ${name}DataQuery {
            ${queryField.name} {
                ${columns.join('\n')}
            }
        }
    `;
    return { queryString, queryName: queryField.name, columns };
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
    //get insert columns
    //get fields
    //get insert mutation type
    const insertMutationType = rootMutationType.fields.find(
        (field) => field.name === insertMutationName(name)
    ) as IntrospectionField;
    const modelTypeModelName =
        insertMutationType &&
        insertMutationType.type.kind === 'OBJECT' &&
        insertMutationType.type.name;
    const model = modelTypeModelName && typesMap[modelTypeModelName];

    const insertArgumentName = 'object';

    const insertObjectArgumentInput = insertMutationType?.args.find(
        (arg) => arg.name === insertArgumentName
    );
    const insertObjectTypeName =
        insertObjectArgumentInput &&
        insertObjectArgumentInput.type.kind === 'NON_NULL' &&
        insertObjectArgumentInput.type.ofType.kind === 'INPUT_OBJECT'
            ? insertObjectArgumentInput?.type.ofType.name
            : '';

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
        type:
            arg.type.kind === 'SCALAR'
                ? arg.type.name
                : Object(arg.type).ofType.name,
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

export function getCanEdit(schemaData: SchemaData, name: string) {
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
export function getCanDelete(schemaData: SchemaData, name: string) {
    const rootMutation = schemaData.typesMap[
        schemaData.mutationType!
    ] as IntrospectionObjectType;

    return !!rootMutation?.fields.find(
        (field) => field.name === deleteMutationName(name)
    );
}
export function getCanInsert(schemaData: SchemaData, name: string) {
    const rootMutation = schemaData.typesMap[
        schemaData.mutationType!
    ] as IntrospectionObjectType;

    return !!rootMutation?.fields.find(
        (field) => field.name === insertMutationName(name)
    );
}
