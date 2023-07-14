import type {
    IntrospectionEnumType,
    IntrospectionSchema,
} from 'graphql/utilities';
import type { IntrospectionObjectType } from 'graphql/utilities';
import type { SchemaData } from './DataTables.tsx';

export function getTables(schema: IntrospectionSchema) {
    const { types, queryType } = schema;
    const { fields: queryRootFields } = types.find(
        ({ name }) => name === queryType.name
    ) as IntrospectionObjectType;

    const tables = types.filter(({ name: typeName }) =>
        queryRootFields.find(({ name: fieldName }) => typeName === fieldName)
    );

    return tables;
}

export function generateQueryForModel(schemaData: SchemaData, name = '') {
    const model = schemaData.typesMap[name] as IntrospectionObjectType;

    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryField = queries.fields.find((query) => query.name === name);

    if (!model || !queryField) throw Error('no query for table');

    const availableColumnsType = schemaData.typesMap[
        `${name}_select_column`
    ] as IntrospectionEnumType;
    const columns = availableColumnsType.enumValues.map(({ name }) => name);

    const queryString = `
        query ${name}DataQuery {
            ${queryField.name} {
                ${columns.join('\n')}
            }
        }
    `;
    return { queryString, columns };
}

export function getModelPrimaryKeys(schemaData: SchemaData, name: string) {
    const queries = schemaData.typesMap[
        schemaData.queryType
    ] as IntrospectionObjectType;
    const queryByPk = queries.fields.find(
        (query) => query.name === `${name}_by_pk`
    );
    const pks = queryByPk?.args.map(({ name }) => name) ?? [];
    return pks;
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
