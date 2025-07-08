import { ScrollType } from "../../../../../../../editor/common/editorCommon.js";
import { useAccessor } from "../util/services.js";
import { URI } from "../../../../../../../base/common/uri.js";
import { ChatMessage } from "../../../../common/chatThreadServiceTypes.js";
import { builtinToolNames } from "../../../../common/prompt/prompts.js";
import { BuiltinToolName } from "../../../../common/toolsServiceTypes.js";
import { loadingTitleWrapper } from "./LoadingTitleWrapper.js";
import { ReactNode } from "react";

export const getFolderName = (pathStr: string) => {
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, "/"); // replace any / or \ or \\ with /
	const parts = pathStr.split("/"); // split on /
	// Filter out empty parts (the last element will be empty if path ends with /)
	const nonEmptyParts = parts.filter((part) => part.length > 0);
	if (nonEmptyParts.length === 0) return "/"; // Root directory
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + "/"; // Only one folder
	// Get the last two parts
	const lastTwo = nonEmptyParts.slice(-2);
	return lastTwo.join("/") + "/";
};

export const getBasename = (pathStr: string, parts: number = 1) => {
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, "/"); // replace any / or \ or \\ with /
	const allParts = pathStr.split("/"); // split on /
	if (allParts.length === 0) return pathStr;
	return allParts.slice(-parts).join("/");
};

// Open file utility function
export const openFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number]
) => {
	const commandService = accessor.get("ICommandService");
	const editorService = accessor.get("ICodeEditorService");

	// Get editor selection from CodeSelection range
	let editorSelection = undefined;

	// If we have a selection, create an editor selection from the range
	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER,
		};
	}

	// open the file
	commandService.executeCommand("vscode.open", uri).then(() => {
		// select the text
		setTimeout(() => {
			if (!editorSelection) return;

			const editor = editorService.getActiveCodeEditor();
			if (!editor) return;

			editor.setSelection(editorSelection);
			editor.revealRange(editorSelection, ScrollType.Immediate);
		}, 50); // needed when document was just opened and needs to initialize
	});
};

export const getRelative = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>
) => {
	const workspaceContextService = accessor.get("IWorkspaceContextService");
	let path: string;
	const isInside = workspaceContextService.isInsideWorkspace(uri);
	if (isInside) {
		const f = workspaceContextService
			.getWorkspace()
			.folders.find((f) => uri.fsPath?.startsWith(f.uri.fsPath));
		if (f) {
			path = uri.fsPath.replace(f.uri.fsPath, "");
		} else {
			path = uri.fsPath;
		}
	} else {
		path = uri.fsPath;
	}
	return path || undefined;
};

export const titleOfBuiltinToolName = {
	read_file: {
		done: "Read file",
		proposed: "Read file",
		running: loadingTitleWrapper("Reading file"),
	},
	ls_dir: {
		done: "Inspected folder",
		proposed: "Inspect folder",
		running: loadingTitleWrapper("Inspecting folder"),
	},
	get_dir_tree: {
		done: "Inspected folder tree",
		proposed: "Inspect folder tree",
		running: loadingTitleWrapper("Inspecting folder tree"),
	},
	search_pathnames_only: {
		done: "Searched by file name",
		proposed: "Search by file name",
		running: loadingTitleWrapper("Searching by file name"),
	},
	search_for_files: {
		done: "Searched",
		proposed: "Search",
		running: loadingTitleWrapper("Searching"),
	},
	create_file_or_folder: {
		done: `Created`,
		proposed: `Create`,
		running: loadingTitleWrapper(`Creating`),
	},
	delete_file_or_folder: {
		done: `Deleted`,
		proposed: `Delete`,
		running: loadingTitleWrapper(`Deleting`),
	},
	edit_file: {
		done: `Edited file`,
		proposed: "Edit file",
		running: loadingTitleWrapper("Editing file"),
	},
	rewrite_file: {
		done: `Wrote file`,
		proposed: "Write file",
		running: loadingTitleWrapper("Writing file"),
	},
	run_command: {
		done: `Ran terminal`,
		proposed: "Run terminal",
		running: loadingTitleWrapper("Running terminal"),
	},
	run_persistent_command: {
		done: `Ran terminal`,
		proposed: "Run terminal",
		running: loadingTitleWrapper("Running terminal"),
	},

	open_persistent_terminal: {
		done: `Opened terminal`,
		proposed: "Open terminal",
		running: loadingTitleWrapper("Opening terminal"),
	},
	kill_persistent_terminal: {
		done: `Killed terminal`,
		proposed: "Kill terminal",
		running: loadingTitleWrapper("Killing terminal"),
	},

	read_lint_errors: {
		done: `Read lint errors`,
		proposed: "Read lint errors",
		running: loadingTitleWrapper("Reading lint errors"),
	},
	search_in_file: {
		done: "Searched in file",
		proposed: "Search in file",
		running: loadingTitleWrapper("Searching in file"),
	},
} as const satisfies Record<
	BuiltinToolName,
	{ done: any; proposed: any; running: any }
>;

// should either be past or "-ing" tense, not present tense. Eg. when the LLM searches for something, the user expects it to say "I searched for X" or "I am searching for X". Not "I search X".

export const getTitle = (
	toolMessage: Pick<
		ChatMessage & { role: "tool" },
		"name" | "type" | "mcpServerName"
	>
): ReactNode => {
	const t = toolMessage;

	// non-built-in title
	if (!builtinToolNames.includes(t.name as BuiltinToolName)) {
		// descriptor of Running or Ran etc
		const descriptor =
			t.type === "success"
				? "Called"
				: t.type === "running_now"
					? "Calling"
					: t.type === "tool_request"
						? "Call"
						: t.type === "rejected"
							? "Call"
							: t.type === "invalid_params"
								? "Call"
								: t.type === "tool_error"
									? "Call"
									: "Call";

		const title = `${descriptor} ${toolMessage.mcpServerName || "MCP"}`;
		if (t.type === "running_now" || t.type === "tool_request")
			return loadingTitleWrapper(title);
		return title;
	}

	// built-in title
	else {
		const toolName = t.name as BuiltinToolName;
		if (t.type === "success") return titleOfBuiltinToolName[toolName].done;
		if (t.type === "running_now")
			return titleOfBuiltinToolName[toolName].running;
		return titleOfBuiltinToolName[toolName].proposed;
	}
};
