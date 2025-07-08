/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from "react"; // Added useRef import just in case it was missed, though likely already present

export const AddButton = ({
	disabled,
	text = "Add",
	...props
}: {
	disabled?: boolean;
	text?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			disabled={disabled}
			className={`bg-[#0e70c0] px-3 py-1 text-white rounded-sm ${!disabled
					? "hover:bg-[#1177cb] cursor-pointer"
					: "opacity-50 cursor-not-allowed bg-opacity-70"
				}`}
			{...props}
		>
			{text}
		</button>
	);
};
