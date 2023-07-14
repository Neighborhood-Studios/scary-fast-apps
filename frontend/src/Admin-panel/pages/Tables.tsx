import Breadcrumb from '../components/Breadcrumb.tsx';
import TableOne from '../components/tables/TableOne.tsx';
import TableThree from '../components/tables/TableThree.tsx';
import TableTwo from '../components/tables/TableTwo.tsx';

const Tables = () => {
    return (
        <>
            <Breadcrumb pageName="Tables" />

            <div className="flex flex-col gap-10">
                <TableOne />
                <TableTwo />
                <TableThree />
            </div>
        </>
    );
};

export default Tables;
