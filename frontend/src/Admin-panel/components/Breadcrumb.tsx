import { Link } from 'react-router-dom';
import { ADMIN_ROTES } from '../routes.tsx';
import { BackBtn } from './BackBtn.tsx';
interface BreadcrumbProps {
    pageName: string;
    path?: { label: string; to: string }[];
    hasBack?: boolean;
}
const Breadcrumb = ({ pageName, path, hasBack = false }: BreadcrumbProps) => {
    const crumbs = [
        { label: 'Dashboard', to: ADMIN_ROTES.ADMIN_ROOT as string },
    ].concat(path || []);
    return (
        <div className="mb-6 flex flex-row gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hasBack && <BackBtn />}
            <h2 className="text-title-md2 font-semibold text-black dark:text-white">
                {pageName}
            </h2>

            <nav className="ml-auto">
                <ol className="flex items-center gap-2">
                    {crumbs?.map(({ label, to }) => (
                        <li key={to}>
                            <Link to={to}>{label}</Link>
                            {' / '}
                        </li>
                    ))}
                    <li className="text-primary">{pageName}</li>
                </ol>
            </nav>
        </div>
    );
};

export default Breadcrumb;
