import type { FC } from 'react';
//
import { useLocation, useNavigate } from 'react-router-dom';
//
import { BackSVG } from '../images/icon';

type BackBtnProps = object;
export const BackBtn: FC<BackBtnProps> = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const goBack = () => {
        if (location.key === 'default') {
            navigate('..', { relative: 'path' });
        } else navigate(-1);
    };
    return (
        <span role="button" onClick={goBack}>
            <BackSVG />
        </span>
    );
};
