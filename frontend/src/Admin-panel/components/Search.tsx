import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash';
//
import { CrossmarkSVG, SearchSVG } from '../images/icon';

type SearchProps = {
    initialValue?: string;
    onChange(searchString: string): void;
};
export const Search: FC<SearchProps> = ({ initialValue, onChange }) => {
    const [searchString, setSearchString] = useState(initialValue ?? '');

    //eslint-disable-next-line react-hooks/exhaustive-deps
    const onSearchInput = useCallback(debounce(onChange, 500), [onChange]);

    useEffect(() => onSearchInput(searchString), [searchString, onSearchInput]);
    return (
        <form
            action=""
            onSubmit={() => onChange(searchString)}
            className="relative flex flex-row items-center"
        >
            <SearchSVG className="fill-body hover:fill-primary dark:fill-bodydark dark:hover:fill-primary" />
            <input
                type="text"
                placeholder="Type to search..."
                className="bg-transparent pl-1 pr-4 focus:outline-none"
                value={searchString}
                onChange={({ currentTarget: { value } }) =>
                    setSearchString(value)
                }
            />
            {!!searchString && (
                <span
                    role="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    onClick={() => {
                        setSearchString('');
                        onChange('');
                    }}
                >
                    <CrossmarkSVG />
                </span>
            )}
        </form>
    );
};
