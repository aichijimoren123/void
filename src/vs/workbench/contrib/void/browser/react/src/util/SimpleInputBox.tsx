/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useRef } from 'react';
import { inputBackground, inputForeground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';

export const VoidSimpleInputBox = ({ value, onChangeValue, placeholder, className, disabled, passwordBlur, compact, ...inputProps }: {
	value: string;
	onChangeValue: (value: string) => void;
	placeholder: string;
	className?: string;
	disabled?: boolean;
	compact?: boolean;
	passwordBlur?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
	// Create a ref for the input element to maintain the same DOM node between renders
	const inputRef = useRef<HTMLInputElement>(null);

	// Track if we need to restore selection
	const selectionRef = useRef<{ start: number | null, end: number | null }>({
		start: null,
		end: null
	});

	// Handle value changes without recreating the input
	useEffect(() => {
		const input = inputRef.current;
		if (input && input.value !== value) {
			// Store current selection positions
			selectionRef.current.start = input.selectionStart;
			selectionRef.current.end = input.selectionEnd;

			// Update the value
			input.value = value;

			// Restore selection if we had it before
			if (selectionRef.current.start !== null && selectionRef.current.end !== null) {
				input.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
			}
		}
	}, [value]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		onChangeValue(e.target.value);
	}, [onChangeValue]);

	return (
		<input
			ref={inputRef}
			defaultValue={value} // Use defaultValue instead of value to avoid recreation
			onChange={handleChange}
			placeholder={placeholder}
			disabled={disabled}
			className={`w-full resize-none bg-void-bg-1 text-void-fg-1 placeholder:text-void-fg-3 border border-void-border-2 focus:border-void-border-1
				${compact ? 'py-1 px-2' : 'py-2 px-4 '}
				rounded
				${disabled ? 'opacity-50 cursor-not-allowed' : ''}
				${className}`}
			style={{
				...passwordBlur && { WebkitTextSecurity: 'disc' },
				background: asCssVariable(inputBackground),
				color: asCssVariable(inputForeground)
			}}
			{...inputProps}
			type={undefined} // VS Code is doing some annoyingness that breaks paste if this is defined
		/>
	);
};
