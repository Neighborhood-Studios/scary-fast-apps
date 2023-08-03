import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import './satoshi.css';

import Loader from './common/Loader';
import DefaultLayout from './layout/DefaultLayout.tsx';

function App() {
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        setTimeout(() => setLoading(false), 1000);
    }, []);

    return loading ? (
        <Loader />
    ) : (
        <>
            <DefaultLayout>
                <Outlet />
            </DefaultLayout>
            <ToastContainer
                autoClose={1.5e3}
                icon={false}
                toastClassName="text-black dark:border-strokedark dark:bg-boxdark dark:text-bodydark"
            />
        </>
    );
}

export default App;
