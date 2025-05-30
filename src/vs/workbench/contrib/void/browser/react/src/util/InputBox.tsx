import { useCallback } from "react";
import { IInputBoxStyles, InputBox } from "../../../../../../../base/browser/ui/inputbox/inputBox.js";
import { IDisposable } from "../../../../../../../base/common/lifecycle.js";
import { defaultInputBoxStyles } from "../../../../../../../platform/theme/browser/defaultStyles.js";
import { useAccessor } from "./services.js";
import { WidgetComponent } from "./Widget.js";

export const VoidInputBox = ({ onChangeText, onCreateInstance, inputBoxRef, placeholder, isPasswordField, multiline }: {
    onChangeText: (value: string) => void;
    styles?: Partial<IInputBoxStyles>,
    onCreateInstance?: (instance: InputBox) => void | IDisposable[];
    inputBoxRef?: { current: InputBox | null };
    placeholder: string;
    isPasswordField?: boolean;
    multiline: boolean;
}) => {

    const accessor = useAccessor()

    const contextViewProvider = accessor.get('IContextViewService')
    return <WidgetComponent
        ctor={InputBox}
        className='
            bg-void-bg-1
            @@void-force-child-placeholder-void-fg-1
        '
        propsFn={useCallback((container) => [
            container,
            contextViewProvider,
            {
                inputBoxStyles: {
                    ...defaultInputBoxStyles,
                    inputForeground: "var(--vscode-foreground)",
                    // inputBackground: 'transparent',
                    // inputBorder: 'none',
                },
                placeholder,
                tooltip: '',
                type: isPasswordField ? 'password' : undefined,
                flexibleHeight: multiline,
                flexibleMaxHeight: 500,
                flexibleWidth: false,
            }
        ] as const, [contextViewProvider, placeholder, multiline])}
        dispose={useCallback((instance: InputBox) => {
            instance.dispose()
            instance.element.remove()
        }, [])}
        onCreateInstance={useCallback((instance: InputBox) => {
            const disposables: IDisposable[] = []
            disposables.push(
                instance.onDidChange((newText) => onChangeText(newText))
            )
            if (onCreateInstance) {
                const ds = onCreateInstance(instance) ?? []
                disposables.push(...ds)
            }
            if (inputBoxRef)
                inputBoxRef.current = instance;

            return disposables
        }, [onChangeText, onCreateInstance, inputBoxRef])
        }
    />
};
