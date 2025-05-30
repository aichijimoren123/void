import { useCallback, useEffect, useRef } from "react"
import { Checkbox } from "../../../../../../../base/browser/ui/toggle/toggle.js"
import { defaultCheckboxStyles } from "../../../../../../../platform/theme/browser/defaultStyles.js"
import { WidgetComponent } from "./Widget.js"

export const VoidCheckBox = ({ label, value, onClick, className }: { label: string, value: boolean, onClick: (checked: boolean) => void, className?: string }) => {
    const divRef = useRef<HTMLDivElement | null>(null)
    const instanceRef = useRef<Checkbox | null>(null)

    useEffect(() => {
        if (!instanceRef.current) return
        instanceRef.current.checked = value
    }, [value])


    return <WidgetComponent
        className={className ?? ''}
        ctor={Checkbox}
        propsFn={useCallback((container: HTMLDivElement) => {
            divRef.current = container
            return [label, value, defaultCheckboxStyles] as const
        }, [label, value])}
        onCreateInstance={useCallback((instance: Checkbox) => {
            instanceRef.current = instance;
            divRef.current?.append(instance.domNode)
            const d = instance.onChange(() => onClick(instance.checked))
            return [d]
        }, [onClick])}
        dispose={useCallback((instance: Checkbox) => {
            instance.dispose()
            instance.domNode.remove()
        }, [])}

    />

}