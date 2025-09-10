import { useCallback, useEffect, useState } from "react";
import type { ErrorDto } from "../api/appFetch";
import { registerErrorListener, unregisterErrorListener } from "../utils/error-sink";
import { ErrorModal } from "./ErrorModal";

export function ErrorModalProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [dto, setDto] = useState<ErrorDto | null>(null);

    const show = useCallback((e: ErrorDto) => { setDto(e); setOpen(true); }, []);
    const hide = useCallback(() => setOpen(false), []);

    useEffect(() => { registerErrorListener(show); return unregisterErrorListener; }, [show]);

    return (
        <>
            {children}
            <ErrorModal open={open} error={dto} onClose={hide} />
        </>
    );
}
