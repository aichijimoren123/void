import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";

export const VoidCustomDropdownBox = <T extends NonNullable<any>>({
    options,
    selectedOption,
    onChangeOption,
    getOptionDropdownName,
    getOptionDropdownDetail,
    getOptionDisplayName,
    getOptionsEqual,
    className,
    arrowTouchesText = true,
    matchInputWidth = false,
    gapPx = 0,
    offsetPx = -6,
}: {
    options: T[];
    selectedOption: T | undefined;
    onChangeOption: (newValue: T) => void;
    getOptionDropdownName: (option: T) => string;
    getOptionDropdownDetail?: (option: T) => string;
    getOptionDisplayName: (option: T) => string;
    getOptionsEqual: (a: T, b: T) => boolean;
    className?: string;
    arrowTouchesText?: boolean;
    matchInputWidth?: boolean;
    gapPx?: number;
    offsetPx?: number;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const measureRef = useRef<HTMLDivElement>(null);

    // Replace manual positioning with floating-ui
    const {
        x,
        y,
        strategy,
        refs,
        middlewareData,
        update
    } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'bottom-start',

        middleware: [
            offset({ mainAxis: gapPx, crossAxis: offsetPx }),
            flip({
                boundary: document.body,
                padding: 8
            }),
            shift({
                boundary: document.body,
                padding: 8,
            }),
            size({
                apply({ availableHeight, elements, rects }) {
                    const maxHeight = Math.min(availableHeight)

                    Object.assign(elements.floating.style, {
                        maxHeight: `${maxHeight}px`,
                        overflowY: 'auto',
                        // Ensure the width isn't constrained by the parent
                        width: `${Math.max(
                            rects.reference.width,
                            measureRef.current?.offsetWidth ?? 0
                        )}px`
                    });
                },
                padding: 8,
                // Use viewport as boundary instead of any parent element
                boundary: document.body,
            }),
        ],
        whileElementsMounted: autoUpdate,
        strategy: 'fixed',
    });

    // if the selected option is null, set the selection to the 0th option
    useEffect(() => {
        if (options.length === 0) return
        if (selectedOption !== undefined) return
        onChangeOption(options[0])
    }, [selectedOption, onChangeOption, options])

    // Handle clicks outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const floating = refs.floating.current;
            const reference = refs.reference.current;

            // Check if reference is an HTML element before using contains
            const isReferenceHTMLElement = reference && 'contains' in reference;

            if (
                floating &&
                (!isReferenceHTMLElement || !reference.contains(target)) &&
                !floating.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, refs.floating, refs.reference]);

    if (selectedOption === undefined)
        return null

    return (
        <div className={`inline-block relative ${className}`}>
            {/* Hidden measurement div */}
            <div
                ref={measureRef}
                className="opacity-0 pointer-events-none absolute -left-[999999px] -top-[999999px] flex flex-col"
                aria-hidden="true"
            >
                {options.map((option) => {
                    const optionName = getOptionDropdownName(option);
                    const optionDetail = getOptionDropdownDetail?.(option) || '';

                    return (
                        <div key={optionName + optionDetail} className="flex items-center whitespace-nowrap">
                            <div className="w-4" />
                            <span className="flex justify-between w-full">
                                <span>{optionName}</span>
                                <span>{optionDetail}</span>
                                <span>______</span>
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Select Button */}
            <button
                type='button'
                ref={refs.setReference}
                className="flex items-center h-4 bg-transparent whitespace-nowrap hover:brightness-90 w-full"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate ${arrowTouchesText ? 'mr-1' : ''}`}>
                    {getOptionDisplayName(selectedOption)}
                </span>
                <svg
                    className={`size-3 flex-shrink-0 ${arrowTouchesText ? '' : 'ml-auto'}`}
                    viewBox="0 0 12 12"
                    fill="none"
                >
                    <path
                        d="M2.5 4.5L6 8L9.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={refs.setFloating}
                    className="z-[100] bg-void-bg-1 border-void-border-3 border rounded shadow-lg"
                    style={{
                        position: strategy,
                        top: y ?? 0,
                        left: x ?? 0,
                        width: (matchInputWidth
                            ? (refs.reference.current instanceof HTMLElement ? refs.reference.current.offsetWidth : 0)
                            : Math.max(
                                (refs.reference.current instanceof HTMLElement ? refs.reference.current.offsetWidth : 0),
                                (measureRef.current instanceof HTMLElement ? measureRef.current.offsetWidth : 0)
                            ))
                    }}
                    onWheel={(e) => e.stopPropagation()}
                ><div className='overflow-auto max-h-80'>

                        {options.map((option) => {
                            const thisOptionIsSelected = getOptionsEqual(option, selectedOption);
                            const optionName = getOptionDropdownName(option);
                            const optionDetail = getOptionDropdownDetail?.(option) || '';

                            return (
                                <div
                                    key={optionName}
                                    className={`flex items-center px-2 py-1 pr-4 cursor-pointer whitespace-nowrap
                                    transition-all duration-100
                                    ${thisOptionIsSelected ? 'bg-blue-500 text-white/80' : 'hover:bg-blue-500 hover:text-white/80'}
                                `}
                                    onClick={() => {
                                        onChangeOption(option);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="w-4 flex justify-center flex-shrink-0">
                                        {thisOptionIsSelected && (
                                            <svg className="size-3" viewBox="0 0 12 12" fill="none">
                                                <path
                                                    d="M10 3L4.5 8.5L2 6"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="flex justify-between items-center w-full gap-x-1">
                                        <span>{optionName}</span>
                                        <span className='opacity-60'>{optionDetail}</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}
        </div>
    );
};
