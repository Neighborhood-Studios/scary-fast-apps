import type { FC } from 'react';

import { useArticle } from './api/misc.ts';

type AppProps = object;
export const App: FC<AppProps> = () => {
    const { loading, data, error } = useArticle('hello');

    if (loading) return <>Loading...</>;
    if (error) return <>{`Error! ${error.message}`}</>;

    return (
        <main>
            <h4>{data?.articles[0].message}</h4>
            <pre>{JSON.stringify(data, null, '  ')}</pre>{' '}
        </main>
    );
};

export default App;
