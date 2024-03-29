import type { RouteObject } from 'react-router-dom';
import { generatePath } from 'react-router-dom';
//
import { lazy, Suspense } from 'react';
//
import Loader from './common/Loader';
import { TableData, TableDataItem, TablesList } from './pages/DataTables';
import { TableDataNew } from './pages/DataTables/TableDataNew.tsx';
import { admitRoot } from '../constants.ts';
import { EmptyDashboard } from './pages/Dashboard/EmptyDashboard.tsx';

const ECommerce = lazy(() => import('./pages/Dashboard/ECommerce.tsx'));
const Calendar = lazy(() => import('./pages/Calendar.tsx'));
const Chart = lazy(() => import('./pages/Chart.tsx'));
const FormElements = lazy(() => import('./pages/Form/FormElements.tsx'));
const FormLayout = lazy(() => import('./pages/Form/FormLayout.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));
const Settings = lazy(() => import('./pages/Settings.tsx'));
const Tables = lazy(() => import('./pages/Tables.tsx'));
const Alerts = lazy(() => import('./pages/UiElements/Alerts.tsx'));
const Buttons = lazy(() => import('./pages/UiElements/Buttons.tsx'));
const DataModels = lazy(() => import('./pages/DataTables'));

export enum ADMIN_ROTES {
    ADMIN_ROOT = admitRoot,
    ECOMMERCE = 'ecommerce',
    CALENDAR = 'calendar',
    DATA_TABLES = 'data-tables',
    DATA_TABLE_DATA = ':name',
    DATA_TABLE_DATA_NEW = ':name/new',
    DATA_TABLE_DATA_ITEM = ':name/:pks',
    PROFILE = 'profile',
    FORMS = 'forms',
    FORMS_ELEMENTS = 'forms/form-elements',
    FORMS_LAYOUT = 'forms/form-layout',
    TABLES = 'tables',
    SETTINGS = 'settings',
    CHART = 'chart',
    UI = 'ui',
    UI_ALERTS = 'ui/alerts',
    UI_BUTTONS = 'ui/buttons',
}

export const getTablesPath = () =>
    generatePath([ADMIN_ROTES.ADMIN_ROOT, ADMIN_ROTES.DATA_TABLES].join('/'));
export const getDataModelPath = (name: string) =>
    generatePath(
        [
            ADMIN_ROTES.ADMIN_ROOT,
            ADMIN_ROTES.DATA_TABLES,
            ADMIN_ROTES.DATA_TABLE_DATA,
        ].join('/'),
        { name }
    );
export const getDataTableEditPath = (name: string, id: string | number) =>
    generatePath(
        [
            ADMIN_ROTES.DATA_TABLES,
            ADMIN_ROTES.DATA_TABLE_DATA,
            ADMIN_ROTES.DATA_TABLE_DATA_ITEM,
        ].join('/'),
        { name, id }
    );
export const routes: RouteObject[] = [
    { index: true, element: <EmptyDashboard /> },
    {
        path: ADMIN_ROTES.ECOMMERCE,
        element: (
            <Suspense fallback={<Loader />}>
                <ECommerce />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.CALENDAR,
        element: (
            <Suspense fallback={<Loader />}>
                <Calendar />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.DATA_TABLES,
        element: (
            <Suspense fallback={<Loader />}>
                <DataModels />
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <TablesList />,
            },
            {
                path: ADMIN_ROTES.DATA_TABLE_DATA,
                element: <TableData />,
            },
            {
                path: ADMIN_ROTES.DATA_TABLE_DATA_NEW,
                element: <TableDataNew />,
            },
            {
                path: ADMIN_ROTES.DATA_TABLE_DATA_ITEM,
                element: <TableDataItem />,
            },
        ],
    },
    {
        path: ADMIN_ROTES.PROFILE,
        element: (
            <Suspense fallback={<Loader />}>
                <Profile />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.FORMS_ELEMENTS,
        element: (
            <Suspense fallback={<Loader />}>
                <FormElements />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.FORMS_LAYOUT,
        element: (
            <Suspense fallback={<Loader />}>
                <FormLayout />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.TABLES,
        element: (
            <Suspense fallback={<Loader />}>
                <Tables />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.SETTINGS,
        element: (
            <Suspense fallback={<Loader />}>
                <Settings />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.CHART,
        element: (
            <Suspense fallback={<Loader />}>
                <Chart />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.UI_ALERTS,
        element: (
            <Suspense fallback={<Loader />}>
                <Alerts />
            </Suspense>
        ),
    },
    {
        path: ADMIN_ROTES.UI_BUTTONS,
        element: (
            <Suspense fallback={<Loader />}>
                <Buttons />
            </Suspense>
        ),
    },
];
