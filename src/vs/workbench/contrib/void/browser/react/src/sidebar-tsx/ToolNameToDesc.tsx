import React from "react";
import { useAccessor } from "../util/services.js";
import {
	BuiltinToolCallParams,
	BuiltinToolName,
} from "../../../../common/toolsServiceTypes.js";
import { getBasename, getFolderName, getRelative } from "./utils.js";

export const toolNameToDesc = (
	toolName: BuiltinToolName,
	_toolParams: BuiltinToolCallParams[BuiltinToolName] | undefined,
	accessor: ReturnType<typeof useAccessor>
): {
	desc1: React.ReactNode;
	desc1Info?: string;
} => {
	if (!_toolParams) {
		return { desc1: "" };
	}

	const x = {
		read_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["read_file"];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		ls_dir: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["ls_dir"];
			return {
				desc1: getFolderName(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		search_pathnames_only: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["search_pathnames_only"];
			return {
				desc1: `"${toolParams.query}"`,
			};
		},
		search_for_files: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["search_for_files"];
			return {
				desc1: `"${toolParams.query}"`,
			};
		},
		search_in_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["search_in_file"];
			return {
				desc1: `"${toolParams.query}"`,
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		create_file_or_folder: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["create_file_or_folder"];
			return {
				desc1: toolParams.isFolder
					? getFolderName(toolParams.uri.fsPath) ?? "/"
					: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		delete_file_or_folder: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["delete_file_or_folder"];
			return {
				desc1: toolParams.isFolder
					? getFolderName(toolParams.uri.fsPath) ?? "/"
					: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		rewrite_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["rewrite_file"];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		edit_file: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["edit_file"];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		run_command: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["run_command"];
			return {
				desc1: `"${toolParams.command}"`,
			};
		},
		run_persistent_command: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["run_persistent_command"];
			return {
				desc1: `"${toolParams.command}"`,
			};
		},
		open_persistent_terminal: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["open_persistent_terminal"];
			return { desc1: "" };
		},
		kill_persistent_terminal: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["kill_persistent_terminal"];
			return { desc1: toolParams.persistentTerminalId };
		},
		get_dir_tree: () => {
			const toolParams = _toolParams as BuiltinToolCallParams["get_dir_tree"];
			return {
				desc1: getFolderName(toolParams.uri.fsPath) ?? "/",
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		read_lint_errors: () => {
			const toolParams =
				_toolParams as BuiltinToolCallParams["read_lint_errors"];
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
	};

	try {
		return x[toolName]?.() || { desc1: "" };
	} catch {
		return { desc1: "" };
	}
};
