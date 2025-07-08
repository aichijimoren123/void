import React from "react";
import { useAccessor } from "../util/services.js";
import { URI } from "../../../../../../../base/common/uri.js";
import { ToolMessage } from "../../../../common/chatThreadServiceTypes.js";
import { MAX_FILE_CHARS_PAGE } from "../../../../common/prompt/prompts.js";
import {
	BuiltinToolName,
	LintErrorItem,
	ToolName,
} from "../../../../common/toolsServiceTypes.js";
import { ChatMarkdownRender } from "../markdown/ChatMarkdownRender.js";
import { persistentTerminalNameOfId } from "../../../terminalToolService.js";
import { getBasename, getRelative, getTitle, openFileFn } from "./utils.js";
import { SmallProseWrapper } from "./ProseWrapper.js";
import { ToolChildrenWrapper } from "./ToolChildrenWrapper.js";
import { ToolHeaderParams, ToolHeaderWrapper } from "./ToolHeaderWrapper.js";
import { toolNameToDesc } from "./ToolNameToDesc.js";
import { BottomChildren } from "./BottomChildren.js";
import { CodeChildren } from "./CodeChildren.js";
import { ListableToolItem } from "./ListableToolItem.js";
import { CommandTool } from "./CommandTool.js";
import { EditTool } from "./EditTool.js";

type WrapperProps<T extends ToolName> = {
	toolMessage: Exclude<ToolMessage<T>, { type: "invalid_params" }>;
	messageIdx: number;
	threadId: string;
};

const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[] }) => {
	return (
		<div className="text-xs text-void-fg-4 opacity-80 border-l-2 border-void-warning px-2 py-0.5 flex flex-col gap-0.5 overflow-x-auto whitespace-nowrap">
			{lintErrors.map((error, i) => (
				<div key={i}>
					Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}
				</div>
			))}
		</div>
	);
};

export type ResultWrapper<T extends ToolName> = (
	props: WrapperProps<T>
) => React.ReactNode;

export const builtinToolNameToComponent: {
	[T in BuiltinToolName]: { resultWrapper: ResultWrapper<T> };
} = {
	read_file: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");

			const title = getTitle(toolMessage);

			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			let range: [number, number] | undefined = undefined;
			if (
				toolMessage.params.startLine !== null ||
				toolMessage.params.endLine !== null
			) {
				const start =
					toolMessage.params.startLine === null
						? `1`
						: `${toolMessage.params.startLine}`;
				const end =
					toolMessage.params.endLine === null
						? ``
						: `${toolMessage.params.endLine}`;
				const addStr = `(${start}-${end})`;
				componentParams.desc1 += ` ${addStr}`;
				range = [params.startLine || 1, params.endLine || 1];
			}

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor, range);
				};
				if (result.hasNextPage && params.pageNumber === 1)
					// first page
					componentParams.desc2 = `(truncated after ${Math.round(MAX_FILE_CHARS_PAGE) / 1000
						}k)`;
				else if (params.pageNumber > 1)
					// subsequent pages
					componentParams.desc2 = `(part ${params.pageNumber})`;
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				// JumpToFileButton removed in favor of FileLinkText
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	get_dir_tree: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");

			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			if (params.uri) {
				const rel = getRelative(params.uri, accessor);
				if (rel) componentParams.info = `Only search in ${rel}`;
			}

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.children = (
					<ToolChildrenWrapper>
						<SmallProseWrapper>
							<ChatMarkdownRender
								string={`\`\`\`\n${result.str}\n\`\`\``}
								chatMessageLocation={undefined}
								isApplyEnabled={false}
								isLinkDetectionEnabled={true}
							/>
						</SmallProseWrapper>
					</ToolChildrenWrapper>
				);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	ls_dir: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const explorerService = accessor.get("IExplorerService");
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			if (params.uri) {
				const rel = getRelative(params.uri, accessor);
				if (rel) componentParams.info = `Only search in ${rel}`;
			}

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.numResults = result.children?.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children =
					!result.children ||
						(result.children.length ?? 0) === 0 ? undefined : (
						<ToolChildrenWrapper>
							{result.children.map((child, i) => (
								<ListableToolItem
									key={i}
									name={`${child.name}${child.isDirectory ? "/" : ""}`}
									className="w-full overflow-auto"
									onClick={() => {
										openFileFn(child.uri, accessor);
										// commandService.executeCommand('workbench.view.explorer'); // open in explorer folders view instead
										// explorerService.select(child.uri, true);
									}}
								/>
							))}
							{result.hasNextPage && (
								<ListableToolItem
									name={`Results truncated (${result.itemsRemaining} remaining).`}
									isSmall={true}
									className="w-full overflow-auto"
								/>
							)}
						</ToolChildrenWrapper>
					);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	search_pathnames_only: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			if (params.includePattern) {
				componentParams.info = `Only search in ${params.includePattern}`;
			}

			if (toolMessage.type === "success") {
				const { result, rawParams } = toolMessage;
				componentParams.numResults = result.uris.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children =
					result.uris.length === 0 ? undefined : (
						<ToolChildrenWrapper>
							{result.uris.map((uri, i) => (
								<ListableToolItem
									key={i}
									name={getBasename(uri.fsPath)}
									className="w-full overflow-auto"
									onClick={() => {
										openFileFn(uri, accessor);
									}}
								/>
							))}
							{result.hasNextPage && (
								<ListableToolItem
									name={"Results truncated."}
									isSmall={true}
									className="w-full overflow-auto"
								/>
							)}
						</ToolChildrenWrapper>
					);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	search_for_files: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			if (params.searchInFolder || params.isRegex) {
				let info: string[] = [];
				if (params.searchInFolder) {
					const rel = getRelative(params.searchInFolder, accessor);
					if (rel) info.push(`Only search in ${rel}`);
				}
				if (params.isRegex) {
					info.push(`Uses regex search`);
				}
				componentParams.info = info.join("; ");
			}

			if (toolMessage.type === "success") {
				const { result, rawParams } = toolMessage;
				componentParams.numResults = result.uris.length;
				componentParams.hasNextPage = result.hasNextPage;
				componentParams.children =
					result.uris.length === 0 ? undefined : (
						<ToolChildrenWrapper>
							{result.uris.map((uri, i) => (
								<ListableToolItem
									key={i}
									name={getBasename(uri.fsPath)}
									className="w-full overflow-auto"
									onClick={() => {
										openFileFn(uri, accessor);
									}}
								/>
							))}
							{result.hasNextPage && (
								<ListableToolItem
									name={`Results truncated.`}
									isSmall={true}
									className="w-full overflow-auto"
								/>
							)}
						</ToolChildrenWrapper>
					);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}
			return <ToolHeaderWrapper {...componentParams} />;
		},
	},

	search_in_file: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const toolsService = accessor.get("IToolsService");
			const title = getTitle(toolMessage);
			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			const infoarr: string[] = [];
			const uriStr = getRelative(params.uri, accessor);
			if (uriStr) infoarr.push(uriStr);
			if (params.isRegex) infoarr.push("Uses regex search");
			componentParams.info = infoarr.join("; ");

			if (toolMessage.type === "success") {
				const { result } = toolMessage; // result is array of snippets
				componentParams.numResults = result.lines.length;
				componentParams.children =
					result.lines.length === 0 ? undefined : (
						<ToolChildrenWrapper>
							<CodeChildren className="bg-void-bg-3">
								<pre className="font-mono whitespace-pre">
									{toolsService.stringOfResult["search_in_file"](
										params,
										result
									)}
								</pre>
							</CodeChildren>
						</ToolChildrenWrapper>
					);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},

	read_lint_errors: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");

			const title = getTitle(toolMessage);

			const { uri } = toolMessage.params ?? {};
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			componentParams.info = getRelative(uri, accessor); // full path

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
				if (result.lintErrors)
					componentParams.children = (
						<LintErrorChildren lintErrors={result.lintErrors} />
					);
				else componentParams.children = `No lint errors found.`;
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				// JumpToFileButton removed in favor of FileLinkText
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},

	// ---

	create_file_or_folder: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			componentParams.info = getRelative(params.uri, accessor); // full path

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			} else if (toolMessage.type === "rejected") {
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				if (params) {
					componentParams.onClick = () => {
						openFileFn(params.uri, accessor);
					};
				}
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			} else if (toolMessage.type === "running_now") {
				// nothing more is needed
			} else if (toolMessage.type === "tool_request") {
				// nothing more is needed
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	delete_file_or_folder: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const isFolder = toolMessage.params?.isFolder ?? false;
			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const title = getTitle(toolMessage);
			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const icon = null;

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			componentParams.info = getRelative(params.uri, accessor); // full path

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			} else if (toolMessage.type === "rejected") {
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				if (params) {
					componentParams.onClick = () => {
						openFileFn(params.uri, accessor);
					};
				}
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			} else if (toolMessage.type === "running_now") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			} else if (toolMessage.type === "tool_request") {
				const { result } = toolMessage;
				componentParams.onClick = () => {
					openFileFn(params.uri, accessor);
				};
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	rewrite_file: {
		resultWrapper: (params) => {
			return (
				<EditTool {...params} content={params.toolMessage.params.newContent} />
			);
		},
	},
	edit_file: {
		resultWrapper: (params) => {
			return (
				<EditTool
					{...params}
					content={params.toolMessage.params.searchReplaceBlocks}
				/>
			);
		},
	},

	// ---

	run_command: {
		resultWrapper: (params) => {
			return <CommandTool {...params} type="run_command" />;
		},
	},

	run_persistent_command: {
		resultWrapper: (params) => {
			return <CommandTool {...params} type="run_persistent_command" />;
		},
	},
	open_persistent_terminal: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const terminalToolsService = accessor.get("ITerminalToolService");

			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const title = getTitle(toolMessage);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			const relativePath = params.cwd
				? getRelative(URI.file(params.cwd), accessor)
				: "";
			componentParams.info = relativePath
				? `Running in ${relativePath}`
				: undefined;

			if (toolMessage.type === "success") {
				const { result } = toolMessage;
				const { persistentTerminalId } = result;
				componentParams.desc1 =
					persistentTerminalNameOfId(persistentTerminalId);
				componentParams.onClick = () =>
					terminalToolsService.focusPersistentTerminal(persistentTerminalId);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
	kill_persistent_terminal: {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const commandService = accessor.get("ICommandService");
			const terminalToolsService = accessor.get("ITerminalToolService");

			const { desc1, desc1Info } = toolNameToDesc(
				toolMessage.name,
				toolMessage.params,
				accessor
			);
			const title = getTitle(toolMessage);
			const icon = null;

			if (toolMessage.type === "tool_request") return null; // do not show past requests
			if (toolMessage.type === "running_now") return null; // do not show running

			const isError = false;
			const isRejected = toolMessage.type === "rejected";
			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = {
				title,
				desc1,
				desc1Info,
				isError,
				icon,
				isRejected,
			};

			if (toolMessage.type === "success") {
				const { persistentTerminalId } = params;
				componentParams.desc1 =
					persistentTerminalNameOfId(persistentTerminalId);
				componentParams.onClick = () =>
					terminalToolsService.focusPersistentTerminal(persistentTerminalId);
			} else if (toolMessage.type === "tool_error") {
				const { result } = toolMessage;
				componentParams.bottomChildren = (
					<BottomChildren title="Error">
						<CodeChildren>{result}</CodeChildren>
					</BottomChildren>
				);
			}

			return <ToolHeaderWrapper {...componentParams} />;
		},
	},
};
