/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useState } from "react"; // Added useRef import just in case it was missed, though likely already present
import { VoidButtonBgDarken } from "../util/DarkenBgButton.js";
import { useAccessor } from "../util/services.js";
import { WarningBox } from "./WarningBox.js";
import { os } from "../../../../common/helpers/systemInfo.js";
import { TransferEditorType } from "../../../extensionTransferTypes.js";
import { IconLoading } from "../sidebar-tsx/Icons.js";
import { AnimatedCheckmarkButton } from "./AnimatedCheckmarkButton.js";

export const OneClickSwitchButton = ({
	fromEditor = "VS Code",
	className = "",
}: {
	fromEditor?: TransferEditorType;
	className?: string;
}) => {
	const accessor = useAccessor();
	const extensionTransferService = accessor.get("IExtensionTransferService");

	const [transferState, setTransferState] = useState<
		{ type: "done"; error?: string } | { type: "loading" | "justfinished" }
	>({ type: "done" });

	const onClick = async () => {
		if (transferState.type !== "done") return;

		setTransferState({ type: "loading" });

		const errAcc = await extensionTransferService.transferExtensions(
			os,
			fromEditor
		);

		// Even if some files were missing, consider it a success if no actual errors occurred
		const hadError = !!errAcc;
		if (hadError) {
			setTransferState({ type: "done", error: errAcc });
		} else {
			setTransferState({ type: "justfinished" });
			setTimeout(() => {
				setTransferState({ type: "done" });
			}, 3000);
		}
	};

	return (
		<>
			<VoidButtonBgDarken
				className={`max-w-48 p-4 ${className}`}
				disabled={transferState.type !== "done"}
				onClick={onClick}
			>
				{transferState.type === "done" ? (
					`Transfer from ${fromEditor}`
				) : transferState.type === "loading" ? (
					<span className="text-nowrap flex flex-nowrap">
						Transferring
						<IconLoading />
					</span>
				) : transferState.type === "justfinished" ? (
					<AnimatedCheckmarkButton
						text="Settings Transferred"
						className="bg-none"
					/>
				) : null}
			</VoidButtonBgDarken>
			{transferState.type === "done" && transferState.error ? (
				<WarningBox text={transferState.error} />
			) : null}
		</>
	);
};
