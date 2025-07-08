/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, {

} from "react"; // Added useRef import just in case it was missed, though likely already present

import {

	VoidSwitch,
} from "../util/Switch.js";
import {
	useAccessor,

	useSettingsState,
} from "../util/services.js";

import { WarningBox } from "./WarningBox.js";

import { MCPServer } from "../../../../common/mcpServiceTypes.js";
import { useMCPServiceState } from "../util/services.js";

// MCP Server component
const MCPServerComponent = ({
	name,
	server,
}: {
	name: string;
	server: MCPServer;
}) => {
	const accessor = useAccessor();
	const mcpService = accessor.get("IMCPService");

	const voidSettings = useSettingsState();
	const isOn = voidSettings.mcpUserStateOfName[name]?.isOn;

	const removeUniquePrefix = (name: string) =>
		name.split("_").slice(1).join("_");

	return (
		<div className="border border-void-border-2 bg-void-bg-1 py-3 px-4 rounded-sm my-2">
			<div className="flex items-center justify-between">
				{/* Left side - status and name */}
				<div className="flex items-center gap-2">
					{/* Status indicator */}
					<div
						className={`w-2 h-2 rounded-full
						${server.status === "success"
								? "bg-green-500"
								: server.status === "error"
									? "bg-red-500"
									: server.status === "loading"
										? "bg-yellow-500"
										: server.status === "offline"
											? "bg-void-fg-3"
											: ""
							}
					`}
					></div>

					{/* Server name */}
					<div className="text-sm font-medium text-void-fg-1">{name}</div>
				</div>

				{/* Right side - power toggle switch */}
				<VoidSwitch
					value={isOn ?? false}
					size="xs"
					disabled={server.status === "error"}
					onChange={() => mcpService.toggleServerIsOn(name, !isOn)}
				/>
			</div>

			{/* Tools section */}
			{isOn && (
				<div className="mt-3">
					<div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
						{(server.tools ?? []).length > 0 ? (
							(server.tools ?? []).map(
								(tool: { name: string; description?: string }) => (
									<span
										key={tool.name}
										className="px-2 py-0.5 bg-void-bg-2 text-void-fg-3 rounded-sm text-xs"
										data-tooltip-id="void-tooltip"
										data-tooltip-content={tool.description || ""}
										data-tooltip-class-name="void-max-w-[300px]"
									>
										{removeUniquePrefix(tool.name)}
									</span>
								)
							)
						) : (
							<span className="text-xs text-void-fg-3">No tools available</span>
						)}
					</div>
				</div>
			)}

			{/* Command badge */}
			{isOn && server.command && (
				<div className="mt-3">
					<div className="text-xs text-void-fg-3 mb-1">Command:</div>
					<div className="px-2 py-1 bg-void-bg-2 text-xs font-mono overflow-x-auto whitespace-nowrap text-void-fg-2 rounded-sm">
						{server.command}
					</div>
				</div>
			)}

			{/* Error message if present */}
			{server.error && (
				<div className="mt-3">
					<WarningBox text={server.error} />
				</div>
			)}
		</div>
	);
};

// Main component that renders the list of servers
export const MCPServersList = () => {
	const mcpServiceState = useMCPServiceState();

	let content: React.ReactNode;
	if (mcpServiceState.error) {
		content = (
			<div className="text-void-fg-3 text-sm mt-2">{mcpServiceState.error}</div>
		);
	} else {
		const entries = Object.entries(mcpServiceState.mcpServerOfName);
		if (entries.length === 0) {
			content = (
				<div className="text-void-fg-3 text-sm mt-2">No servers found</div>
			);
		} else {
			content = entries.map(([name, server]) => (
				<MCPServerComponent key={name} name={name} server={server} />
			));
		}
	}

	return <div className="my-2">{content}</div>;
};
