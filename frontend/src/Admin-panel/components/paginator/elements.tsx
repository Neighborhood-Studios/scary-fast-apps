// import styled from 'styled-components/macro';
// import { transparentize } from 'polished';
import type { FC, PropsWithChildren } from 'react';
// import { spanStatusfromHttpCode } from '@sentry/react';

// export const PaginationItem_0 = styled.span`
//     display: inline-block;
//     line-height: 1.5em;
//     min-width: 1.5em;
//     height: 1.5em;
//     text-align: center;
//     padding: 0.5em;
// `;
export const PaginationItem: FC<PropsWithChildren> = (props) => {
    return (
        <span
            className="inline-block leading-[1.5em] min-w-[1.5em] text-center p-[0.25em]"
            {...props}
        >
            {props.children}
        </span>
    );
};
// export const ActivePage_0 = styled(PaginationItem)`
//     color: ${({ theme }) => theme.colors.primaryColor};
//     background: ${({ theme }) =>
//         transparentize(0.94, theme.colors.primaryColor)};
//     border-radius: 50%;
// `;

export const ActivePage: FC<PropsWithChildren> = ({ children, ...props }) => (
    <span
        {...props}
        className="
inline-block leading-[1.5em] min-w-[1.5em] text-center p-[0.25em]
    text-meta-5
  "
    >
        {children}
    </span>
);

// export const PaginationControl = styled.span`
//     font-size: 1.5em;
//     margin: 0;
//     color: hsl(0, 0%, 71%);
//
//     svg {
//         height: 7px;
//         width: auto;
//     }
// `;
export const PaginationControl: FC<PropsWithChildren> = ({
    children,
    ...props
}) => (
    <span {...props} className="h-fit">
        {children}
    </span>
);

/*
export const PaginationControl:FC<PropsWithChildren> = ({children, ...props}) => <span
  {...props}
  className="text-xl m-0"
>{children}</span>

export const PaginationWrapper = styled.div`
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.2rem;
    text-align: center;

    a {
        display: inline-block;
        line-height: 1em;

        ${PaginationItem} {
            color: hsl(0, 0%, 71%);
            background: none;
        }

        ${PaginationControl} {
            color: ${({ theme }) => theme.colors.primaryColor};
            font-size: 0.2em;
        }
    }
`;
*/

export const PaginationWrapper: FC<PropsWithChildren> = ({
    children,
    ...props
}) => (
    <div
        className="text-[0.75em] font-semibold my-1 text-center flex flex-row justify-center items-center"
        {...props}
    >
        {children}
    </div>
);
