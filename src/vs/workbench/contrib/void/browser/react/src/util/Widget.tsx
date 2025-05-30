import { useEffect, useRef } from "react";
import { IDisposable } from "../../../../../../../base/common/lifecycle.js";

// type guard
const isConstructor = (f: any)
	: f is { new(...params: any[]): any } => {
	return !!f.prototype && f.prototype.constructor === f;
}

export const WidgetComponent = <CtorParams extends any[], Instance>({ ctor, propsFn, dispose, onCreateInstance, children, className }
    : {
        ctor: { new(...params: CtorParams): Instance } | ((container: HTMLDivElement) => Instance),
        propsFn: (container: HTMLDivElement) => CtorParams, // unused if fn
        onCreateInstance: (instance: Instance) => IDisposable[],
        dispose: (instance: Instance) => void,
        children?: React.ReactNode,
        className?: string
    }
) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const instance = isConstructor(ctor) ? new ctor(...propsFn(containerRef.current!)) : ctor(containerRef.current!)
        const disposables = onCreateInstance(instance);
        return () => {
            disposables.forEach(d => d.dispose());
            dispose(instance)
        }
    }, [ctor, propsFn, dispose, onCreateInstance, containerRef])

    return <div ref={containerRef} className={className === undefined ? `w-full` : className}>{children}</div>
}
