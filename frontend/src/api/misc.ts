import { gql, useQuery } from '@apollo/client';

export const getArticleByAlias = gql`
    query MyQuery($alias: String!) {
        articles(where: { alias: { _eq: $alias } }) {
            message
        }
    }
`;

export const useArticle = (articleAlias: string) =>
    useQuery(getArticleByAlias, { variables: { alias: articleAlias } });
