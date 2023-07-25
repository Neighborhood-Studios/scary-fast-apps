import type { FC } from 'react';
import type { IntrospectionSchema, IntrospectionType } from 'graphql/utilities';

import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Outlet } from 'react-router-dom';

import Loader from '../../common/Loader';

export type SchemaData = {
    queryType: string;
    mutationType: string | undefined;
    typesMap: Record<string, IntrospectionType>;
};
export type OutletContextType = SchemaData & {
    schema: IntrospectionSchema;
};

type DataTablesProps = object;
export const DataTables: FC<DataTablesProps> = () => {
    const { data, loading /*, error*/ } = useQuery(SchemaQuery);

    const schemaData: OutletContextType | null = useMemo(() => {
        if (!data) return null;
        const schema: IntrospectionSchema = data?.__schema;
        const queryType = schema.queryType.name;
        const mutationType = schema.mutationType?.name;
        const typesMap = schema.types.reduce<Record<string, IntrospectionType>>(
            (typesMap, type) => Object.assign(typesMap, { [type.name]: type }),
            {}
        );
        return {
            queryType,
            mutationType,
            typesMap,
            schema,
        };
    }, [data]);
    // console.log(schemaData); //IgrEd dev
    return loading ? <Loader /> : schemaData && <Outlet context={schemaData} />;
};

const SchemaQuery = gql`
    query IntrospectionQuery {
        __schema {
            queryType {
                name
            }
            mutationType {
                name
            }
            types {
                ...FullType
            }
        }
    }

    fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
            name
            description
            args {
                ...InputValue
            }
            type {
                ...TypeRef
            }
            isDeprecated
            deprecationReason
        }
        inputFields {
            ...InputValue
        }
        interfaces {
            ...TypeRef
        }
        enumValues(includeDeprecated: true) {
            name
            description
            isDeprecated
            deprecationReason
        }
        possibleTypes {
            ...TypeRef
        }
    }

    fragment InputValue on __InputValue {
        name
        description
        type {
            ...TypeRef
        }
        defaultValue
    }

    fragment TypeRef on __Type {
        kind
        name
        ofType {
            kind
            name
            ofType {
                kind
                name
                ofType {
                    kind
                    name
                    ofType {
                        kind
                        name
                        ofType {
                            kind
                            name
                            ofType {
                                kind
                                name
                                ofType {
                                    kind
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;
