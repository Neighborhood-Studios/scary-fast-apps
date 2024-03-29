const Loader = ({ local }: { local?: boolean }) => {
    return (
        <div
            className={`flex ${
                local ? 'h-full' : 'h-screen'
            } items-center justify-center bg-white dark:bg-boxdark`}
        >
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
    );
};

export default Loader;
