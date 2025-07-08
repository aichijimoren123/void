/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

export const VoidSlider = ({
	value,
	onChange,
	size = 'md',
	disabled = false,
	min = 0,
	max = 7,
	step = 1,
	className = '',
	width = 200,
}: {
	value: number;
	onChange: (value: number) => void;
	disabled?: boolean;
	size?: 'xxs' | 'xs' | 'sm' | 'sm+' | 'md';
	min?: number;
	max?: number;
	step?: number;
	className?: string;
	width?: number;
}) => {
	// Calculate percentage for position
	const percentage = ((value - min) / (max - min)) * 100;

	// Handle track click
	const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (disabled) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const clickPosition = e.clientX - rect.left;
		const trackWidth = rect.width;

		// Calculate new value
		const newPercentage = Math.max(0, Math.min(1, clickPosition / trackWidth));
		const rawValue = min + newPercentage * (max - min);

		// Special handling to ensure max value is always reachable
		if (rawValue >= max - step / 2) {
			onChange(max);
			return;
		}

		// Normal step calculation
		const steppedValue = Math.round((rawValue - min) / step) * step + min;
		const clampedValue = Math.max(min, Math.min(max, steppedValue));

		onChange(clampedValue);
	};

	// Helper function to handle thumb dragging that respects steps and max
	const handleThumbDrag = (moveEvent: MouseEvent, track: Element) => {
		if (!track) return;

		const rect = (track as HTMLElement).getBoundingClientRect();
		const movePosition = moveEvent.clientX - rect.left;
		const trackWidth = rect.width;

		// Calculate new value
		const newPercentage = Math.max(0, Math.min(1, movePosition / trackWidth));
		const rawValue = min + newPercentage * (max - min);

		// Special handling to ensure max value is always reachable
		if (rawValue >= max - step / 2) {
			onChange(max);
			return;
		}

		// Normal step calculation
		const steppedValue = Math.round((rawValue - min) / step) * step + min;
		const clampedValue = Math.max(min, Math.min(max, steppedValue));

		onChange(clampedValue);
	};

	return (
		<div className={`inline-flex items-center flex-shrink-0 ${className}`}>
			{/* Outer container with padding to account for thumb overhang */}
			<div className={`relative flex-shrink-0 ${disabled ? 'opacity-25' : ''}`}
				style={{
					width,
					// Add horizontal padding equal to half the thumb width
					// paddingLeft: thumbSizePx / 2,
					// paddingRight: thumbSizePx / 2
				}}>
				{/* Track container with adjusted width */}
				<div className="relative w-full">
					{/* Invisible wider clickable area that sits above the track */}
					<div
						className="absolute w-full cursor-pointer"
						style={{
							height: '16px',
							top: '50%',
							transform: 'translateY(-50%)',
							zIndex: 1
						}}
						onClick={handleTrackClick}
					/>

					{/* Track */}
					<div
						className={`relative ${size === 'xxs' ? 'h-0.5' :
							size === 'xs' ? 'h-1' :
								size === 'sm' ? 'h-1.5' :
									size === 'sm+' ? 'h-2' : 'h-2.5'
							} bg-void-bg-2 rounded-full cursor-pointer`}
						onClick={handleTrackClick}
					>
						{/* Filled part of track */}
						<div
							className={`absolute left-0 ${size === 'xxs' ? 'h-0.5' :
								size === 'xs' ? 'h-1' :
									size === 'sm' ? 'h-1.5' :
										size === 'sm+' ? 'h-2' : 'h-2.5'
								} bg-void-fg-1 rounded-full`}
							style={{ width: `${percentage}%` }}
						/>
					</div>

					{/* Thumb */}
					<div
						className={`absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2
							${size === 'xxs' ? 'h-2 w-2' :
								size === 'xs' ? 'h-2.5 w-2.5' :
									size === 'sm' ? 'h-3 w-3' :
										size === 'sm+' ? 'h-3.5 w-3.5' : 'h-4 w-4'
							}
							bg-void-fg-1 rounded-full shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
							border border-void-fg-1`}
						style={{ left: `${percentage}%`, zIndex: 2 }}  // Ensure thumb is above the invisible clickable area
						onMouseDown={(e) => {
							if (disabled) return;

							const track = e.currentTarget.previousElementSibling;

							const handleMouseMove = (moveEvent: MouseEvent) => {
								handleThumbDrag(moveEvent, track as Element);
							};

							const handleMouseUp = () => {
								document.removeEventListener('mousemove', handleMouseMove);
								document.removeEventListener('mouseup', handleMouseUp);
								document.body.style.cursor = '';
								document.body.style.userSelect = '';
							};

							document.body.style.userSelect = 'none';
							document.body.style.cursor = 'grabbing';
							document.addEventListener('mousemove', handleMouseMove);
							document.addEventListener('mouseup', handleMouseUp);

							e.preventDefault();
						}}
					/>
				</div>
			</div>
		</div>
	);
};
