// https://www.heap.io, https://heapanalytics.com

const HEAP_APP_ID = import.meta.env.VITE_APP_HEAP_ID;
const heap = (window.heap = window.heap || []);
heap.load = function (appid, config) {
    window.heap.appid = appid;
    window.heap.config = config || {};
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.heapanalytics.com/js/heap-' + appid + '.js';
    document.head.prepend(script);
    for (
        let n = function (e) {
                return function () {
                    heap.push(
                        [e].concat(Array.prototype.slice.call(arguments, 0))
                    );
                };
            },
            p = [
                'addEventProperties',
                'addUserProperties',
                'clearEventProperties',
                'identify',
                'resetIdentity',
                'removeEventProperty',
                'setEventProperties',
                'track',
                'unsetEventProperty',
            ],
            o = 0;
        o < p.length;
        o++
    )
        heap[p[o]] = n(p[o]);
};

export default {
    load() {
        HEAP_APP_ID && heap.load(HEAP_APP_ID);
    },
    get identify() {
        return window.heap?.identify.bind(window.heap);
    },
};
