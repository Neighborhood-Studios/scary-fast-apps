import { ReactElement } from 'react';
import { toast } from 'react-toastify';

export function showToast(
    toastId: string,
    content: ReactElement,
    type: (typeof toast.TYPE)[keyof typeof toast.TYPE],
    autoClose?: number | false | undefined
) {
    if (toast.isActive(toastId)) {
        return toast.update(toastId, {
            render: () => content,
            type,
            autoClose,
        });
    }
    return toast(content, { toastId, type, autoClose });
}
