import { useEffect, useState } from 'react';

import './index.css';
import './satoshi.css';

import Loader from './common/Loader';
import DefaultLayout from './layout/DefaultLayout.tsx';
import { Outlet } from 'react-router-dom';

function App() {
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        setTimeout(() => setLoading(false), 1000);
    }, []);

    return loading ? (
        <Loader />
    ) : (
        <DefaultLayout>
            <Outlet />
        </DefaultLayout>
    );
}

export default App;
