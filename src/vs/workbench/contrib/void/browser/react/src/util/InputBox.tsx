import React, {
	forwardRef,
	ForwardRefExoticComponent,
	RefAttributes,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	autoUpdate,
	flip,
	offset,
	shift,
	size,
	useFloating,
} from "@floating-ui/react";
import { ChevronRight, File, Folder, LucideProps } from "lucide-react";
import { URI } from "../../../../../../../base/common/uri.js";
import {
	inputBackground,
	inputForeground,
} from "../../../../../../../platform/theme/common/colorRegistry.js";
import { asCssVariable } from "../../../../../../../platform/theme/common/colorUtils.js";
import { StagingSelectionItem } from "../../../../common/chatThreadServiceTypes.js";
import { useAccessor } from "./services.js";
import { getBasename } from "../sidebar-tsx/utils.js";

type GenerateNextOptions = (optionText: string) => Promise<Option[]>;

type Option = {
	fullName: string;
	abbreviatedName: string;
	iconInMenu: ForwardRefExoticComponent<
		Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
	>; // type for lucide-react components
} & (
		| {
			leafNodeType?: undefined;
			nextOptions: Option[];
			generateNextOptions?: undefined;
		}
		| {
			leafNodeType?: undefined;
			nextOptions?: undefined;
			generateNextOptions: GenerateNextOptions;
		}
		| {
			leafNodeType: "File" | "Folder";
			uri: URI;
			nextOptions?: undefined;
			generateNextOptions?: undefined;
		}
	);

const isSubsequence = (text: string, pattern: string): boolean => {
	text = text.toLowerCase();
	pattern = pattern.toLowerCase();

	if (pattern === "") return true;
	if (text === "") return false;
	if (pattern.length > text.length) return false;

	const seq: boolean[][] = Array(pattern.length + 1)
		.fill(null)
		.map(() => Array(text.length + 1).fill(false));

	for (let j = 0; j <= text.length; j++) {
		seq[0][j] = true;
	}

	for (let i = 1; i <= pattern.length; i++) {
		for (let j = 1; j <= text.length; j++) {
			if (pattern[i - 1] === text[j - 1]) {
				seq[i][j] = seq[i - 1][j - 1];
			} else {
				seq[i][j] = seq[i][j - 1];
			}
		}
	}
	return seq[pattern.length][text.length];
};

const scoreSubsequence = (text: string, pattern: string): number => {
	if (pattern === "") return 0;

	text = text.toLowerCase();
	pattern = pattern.toLowerCase();

	// We'll use dynamic programming to find the longest consecutive substring
	const n = text.length;
	const m = pattern.length;

	// This will track our maximum consecutive match length
	let maxConsecutive = 0;

	// For each starting position in the text
	for (let i = 0; i < n; i++) {
		// Check for matches starting from this position
		let consecutiveCount = 0;

		// For each character in the pattern
		for (let j = 0; j < m; j++) {
			// If we have a match and we're still within text bounds
			if (i + j < n && text[i + j] === pattern[j]) {
				consecutiveCount++;
			} else {
				// Break on first non-match
				break;
			}
		}

		// Update our maximum
		maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
	}

	return maxConsecutive;
};

function getRelativeWorkspacePath(
	accessor: ReturnType<typeof useAccessor>,
	uri: URI
): string {
	const workspaceService = accessor.get("IWorkspaceContextService");
	const workspaceFolders = workspaceService.getWorkspace().folders;

	if (!workspaceFolders.length) {
		return uri.fsPath; // No workspace folders, return original path
	}

	// Sort workspace folders by path length (descending) to match the most specific folder first
	const sortedFolders = [...workspaceFolders].sort(
		(a, b) => b.uri.fsPath.length - a.uri.fsPath.length
	);

	// Add trailing slash to paths for exact matching
	const uriPath = uri.fsPath.endsWith("/") ? uri.fsPath : uri.fsPath + "/";

	// Check if the URI is inside any workspace folder
	for (const folder of sortedFolders) {
		const folderPath = folder.uri.fsPath.endsWith("/")
			? folder.uri.fsPath
			: folder.uri.fsPath + "/";
		if (uriPath.startsWith(folderPath)) {
			// Calculate the relative path by removing the workspace folder path
			let relativePath = uri.fsPath.slice(folder.uri.fsPath.length);
			// Remove leading slash if present
			if (relativePath.startsWith("/")) {
				relativePath = relativePath.slice(1);
			}
			// console.log({ folderPath, relativePath, uriPath });

			return relativePath;
		}
	}

	// URI is not in any workspace folder, return original path
	return uri.fsPath;
}

const numOptionsToShow = 100;

// TODO make this unique based on other options
const getAbbreviatedName = (relativePath: string) => {
	return getBasename(relativePath, 1);
};

const getOptionsAtPath = async (
	accessor: ReturnType<typeof useAccessor>,
	path: string[],
	optionText: string
): Promise<Option[]> => {
	const toolsService = accessor.get("IToolsService");

	const searchForFilesOrFolders = async (
		t: string,
		searchFor: "files" | "folders"
	) => {
		try {
			const searchResults = (
				await (
					await toolsService.callTool.search_pathnames_only({
						query: t,
						includePattern: null,
						pageNumber: 1,
					})
				).result
			).uris;

			if (searchFor === "files") {
				const res: Option[] = searchResults.map((uri) => {
					const relativePath = getRelativeWorkspacePath(accessor, uri);
					return {
						leafNodeType: "File",
						uri: uri,
						iconInMenu: File,
						fullName: relativePath,
						abbreviatedName: getAbbreviatedName(relativePath),
					};
				});
				return res;
			} else if (searchFor === "folders") {
				// Extract unique directory paths from the results
				const directoryMap = new Map<string, URI>();

				for (const uri of searchResults) {
					if (!uri) continue;

					// Get the full path and extract directories
					const relativePath = getRelativeWorkspacePath(accessor, uri);
					const pathParts = relativePath.split("/");

					// Get workspace info
					const workspaceService = accessor.get("IWorkspaceContextService");
					const workspaceFolders = workspaceService.getWorkspace().folders;

					// Find the workspace folder containing this URI
					let workspaceFolderUri: URI | undefined;
					if (workspaceFolders.length) {
						// Sort workspace folders by path length (descending) to match the most specific folder first
						const sortedFolders = [...workspaceFolders].sort(
							(a, b) => b.uri.fsPath.length - a.uri.fsPath.length
						);

						// Find the containing workspace folder
						for (const folder of sortedFolders) {
							const folderPath = folder.uri.fsPath.endsWith("/")
								? folder.uri.fsPath
								: folder.uri.fsPath + "/";
							const uriPath = uri.fsPath.endsWith("/")
								? uri.fsPath
								: uri.fsPath + "/";

							if (uriPath.startsWith(folderPath)) {
								workspaceFolderUri = folder.uri;
								break;
							}
						}
					}

					if (workspaceFolderUri) {
						// Add each directory and its parents to the map
						let currentPath = "";
						for (let i = 0; i < pathParts.length - 1; i++) {
							currentPath =
								i === 0 ? `/${pathParts[i]}` : `${currentPath}/${pathParts[i]}`;

							// Create a proper directory URI
							const directoryUri = URI.joinPath(
								workspaceFolderUri,
								currentPath.startsWith("/")
									? currentPath.substring(1)
									: currentPath
							);

							directoryMap.set(currentPath, directoryUri);
						}
					}
				}
				// Convert map to array
				return Array.from(directoryMap.entries()).map(
					([relativePath, uri]) => ({
						leafNodeType: "Folder",
						uri: uri,
						iconInMenu: Folder, // Folder
						fullName: relativePath,
						abbreviatedName: getAbbreviatedName(relativePath),
					})
				) satisfies Option[];
			}
		} catch (error) {
			console.error("Error fetching directories:", error);
			return [];
		}
	};

	const allOptions: Option[] = [
		{
			fullName: "files",
			abbreviatedName: "files",
			iconInMenu: File,
			generateNextOptions: async (t) =>
				(await searchForFilesOrFolders(t, "files")) || [],
		},
		{
			fullName: "folders",
			abbreviatedName: "folders",
			iconInMenu: Folder,
			generateNextOptions: async (t) =>
				(await searchForFilesOrFolders(t, "folders")) || [],
		},
	];

	// follow the path in the optionsTree (until the last path element)

	let nextOptionsAtPath = allOptions;
	let generateNextOptionsAtPath: GenerateNextOptions | undefined = undefined;

	for (const pn of path) {
		const selectedOption = nextOptionsAtPath.find(
			(o) => o.fullName.toLowerCase() === pn.toLowerCase()
		);

		if (!selectedOption) return [];

		nextOptionsAtPath = selectedOption.nextOptions!; // assume nextOptions exists until we hit the very last option (the path will never contain the last possible option)
		generateNextOptionsAtPath = selectedOption.generateNextOptions;
	}

	if (generateNextOptionsAtPath) {
		nextOptionsAtPath = await generateNextOptionsAtPath(optionText);
	} else if (path.length === 0 && optionText.trim().length > 0) {
		// (special case): directly search for both files and folders if optionsPath is empty and there's a search term
		const filesResults =
			(await searchForFilesOrFolders(optionText, "files")) || [];
		const foldersResults =
			(await searchForFilesOrFolders(optionText, "folders")) || [];
		nextOptionsAtPath = [...foldersResults, ...filesResults];
	}

	const optionsAtPath = nextOptionsAtPath
		.filter((o) => isSubsequence(o.fullName, optionText))
		.sort((a, b) => {
			// this is a hack but good for now
			const scoreA = scoreSubsequence(a.fullName, optionText);
			const scoreB = scoreSubsequence(b.fullName, optionText);
			return scoreB - scoreA;
		})
		.slice(0, numOptionsToShow); // should go last because sorting/filtering should happen on all datapoints

	return optionsAtPath;
};

export type TextAreaFns = {
	setValue: (v: string) => void;
	enable: () => void;
	disable: () => void;
};

type InputBox2Props = {
	initValue?: string | null;
	placeholder: string;
	multiline: boolean;
	enableAtToMention?: boolean;
	fnsRef?: { current: null | TextAreaFns };
	className?: string;
	onChangeText?: (value: string) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
	onChangeHeight?: (newHeight: number) => void;
	// {{添加 onPaste 属性}}
	onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
};
export const VoidInputBox2 = forwardRef<HTMLTextAreaElement, InputBox2Props>(
	function X(
		{
			initValue,
			placeholder,
			multiline,
			enableAtToMention,
			fnsRef,
			className,
			onKeyDown,
			onFocus,
			onBlur,
			onChangeText,
			onPaste,
		},
		ref
	) {
		// mirrors whatever is in ref
		const accessor = useAccessor();

		const chatThreadService = accessor.get("IChatThreadService");
		const languageService = accessor.get("ILanguageService");

		const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
		const selectedOptionRef = useRef<HTMLDivElement>(null);
		const [isMenuOpen, _setIsMenuOpen] = useState(false); // the @ to mention menu
		const setIsMenuOpen: typeof _setIsMenuOpen = (value) => {
			if (!enableAtToMention) {
				return;
			} // never open menu if not enabled
			_setIsMenuOpen(value);
		};

		// logic for @ to mention vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
		const [optionPath, setOptionPath] = useState<string[]>([]);
		const [optionIdx, setOptionIdx] = useState<number>(0);
		const [options, setOptions] = useState<Option[]>([]);
		const [optionText, setOptionText] = useState<string>("");
		const [didLoadInitialOptions, setDidLoadInitialOptions] = useState(false);

		const currentPathRef = useRef<string>(JSON.stringify([]));

		// dont show breadcrums if first page and user hasnt typed anything
		const isTypingEnabled = true;
		const isBreadcrumbsShowing =
			optionPath.length === 0 && !optionText ? false : true;

		const insertTextAtCursor = (text: string) => {
			const textarea = textAreaRef.current;
			if (!textarea) return;

			// Focus the textarea first
			textarea.focus();

			// delete the @ and set the cursor position
			// Get cursor position
			const startPos = textarea.selectionStart;
			const endPos = textarea.selectionEnd;

			// Get the text before the cursor, excluding the @ symbol that triggered the menu
			const textBeforeCursor = textarea.value.substring(0, startPos - 1);
			const textAfterCursor = textarea.value.substring(endPos);

			// Replace the text including the @ symbol with the selected option
			textarea.value = textBeforeCursor + textAfterCursor;

			// Set cursor position after the inserted text
			const newCursorPos = textBeforeCursor.length;
			textarea.setSelectionRange(newCursorPos, newCursorPos);

			// React's onChange relies on a SyntheticEvent system
			// The best way to ensure it runs is to call callbacks directly
			if (onChangeText) {
				onChangeText(textarea.value);
			}
			adjustHeight();
		};

		const onSelectOption = async () => {
			if (!options.length) {
				return;
			}

			const option = options[optionIdx];
			const newPath = [...optionPath, option.fullName];
			const isLastOption = !option.generateNextOptions && !option.nextOptions;
			setDidLoadInitialOptions(false);
			if (isLastOption) {
				setIsMenuOpen(false);
				insertTextAtCursor(option.abbreviatedName);

				let newSelection: StagingSelectionItem;
				if (option.leafNodeType === "File")
					newSelection = {
						type: "File",
						uri: option.uri,
						language:
							languageService.guessLanguageIdByFilepathOrFirstLine(
								option.uri
							) || "",
						state: { wasAddedAsCurrentFile: false },
					};
				else if (option.leafNodeType === "Folder")
					newSelection = {
						type: "Folder",
						uri: option.uri,
						language: undefined,
						state: undefined,
					};
				else throw new Error(`Unexpected leafNodeType ${option.leafNodeType}`);

				chatThreadService.addNewStagingSelection(newSelection);
			} else {
				currentPathRef.current = JSON.stringify(newPath);
				const newOpts = (await getOptionsAtPath(accessor, newPath, "")) || [];
				if (currentPathRef.current !== JSON.stringify(newPath)) {
					return;
				}
				setOptionPath(newPath);
				setOptionText("");
				setOptionIdx(0);
				setOptions(newOpts);
				setDidLoadInitialOptions(true);
			}
		};

		const onRemoveOption = async () => {
			const newPath = [...optionPath.slice(0, optionPath.length - 1)];
			currentPathRef.current = JSON.stringify(newPath);
			const newOpts = (await getOptionsAtPath(accessor, newPath, "")) || [];
			if (currentPathRef.current !== JSON.stringify(newPath)) {
				return;
			}
			setOptionPath(newPath);
			setOptionText("");
			setOptionIdx(0);
			setOptions(newOpts);
		};

		const onOpenOptionMenu = async () => {
			const newPath: [] = [];
			currentPathRef.current = JSON.stringify([]);
			const newOpts = (await getOptionsAtPath(accessor, [], "")) || [];
			if (currentPathRef.current !== JSON.stringify([])) {
				return;
			}
			setOptionPath(newPath);
			setOptionText("");
			setIsMenuOpen(true);
			setOptionIdx(0);
			setOptions(newOpts);
		};
		const onCloseOptionMenu = () => {
			setIsMenuOpen(false);
		};

		const onNavigateUp = (step = 1, periodic = true) => {
			if (options.length === 0) return;
			setOptionIdx((prevIdx) => {
				const newIdx = prevIdx - step;
				return periodic
					? (newIdx + options.length) % options.length
					: Math.max(0, newIdx);
			});
		};
		const onNavigateDown = (step = 1, periodic = true) => {
			if (options.length === 0) return;
			setOptionIdx((prevIdx) => {
				const newIdx = prevIdx + step;
				return periodic
					? newIdx % options.length
					: Math.min(options.length - 1, newIdx);
			});
		};

		const onNavigateToTop = () => {
			if (options.length === 0) return;
			setOptionIdx(0);
		};
		const onNavigateToBottom = () => {
			if (options.length === 0) return;
			setOptionIdx(options.length - 1);
		};

		const debounceTimerRef = useRef<number | null>(null);

		useEffect(() => {
			// Cleanup function to cancel any pending timeouts when unmounting
			return () => {
				if (debounceTimerRef.current !== null) {
					window.clearTimeout(debounceTimerRef.current);
					debounceTimerRef.current = null;
				}
			};
		}, []);

		// debounced, but immediate if text is empty
		const onPathTextChange = useCallback(
			(newStr: string) => {
				setOptionText(newStr);

				if (debounceTimerRef.current !== null) {
					window.clearTimeout(debounceTimerRef.current);
				}

				currentPathRef.current = JSON.stringify(optionPath);

				const fetchOptions = async () => {
					const newOpts =
						(await getOptionsAtPath(accessor, optionPath, newStr)) || [];
					if (currentPathRef.current !== JSON.stringify(optionPath)) {
						return;
					}
					setOptions(newOpts);
					setOptionIdx(0);
					debounceTimerRef.current = null;
				};

				// If text is empty, run immediately without debouncing
				if (newStr.trim() === "") {
					fetchOptions();
				} else {
					// Otherwise, set a new timeout to fetch options after a delay
					debounceTimerRef.current = window.setTimeout(fetchOptions, 300);
				}
			},
			[optionPath, accessor]
		);

		const onMenuKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			const isCommandKeyPressed = e.altKey || e.ctrlKey || e.metaKey;

			if (e.key === "ArrowUp") {
				if (isCommandKeyPressed) {
					onNavigateToTop();
				} else {
					if (e.altKey) {
						onNavigateUp(10, false);
					} else {
						onNavigateUp();
					}
				}
			} else if (e.key === "ArrowDown") {
				if (isCommandKeyPressed) {
					onNavigateToBottom();
				} else {
					if (e.altKey) {
						onNavigateDown(10, false);
					} else {
						onNavigateDown();
					}
				}
			} else if (e.key === "ArrowLeft") {
				onRemoveOption();
			} else if (e.key === "ArrowRight") {
				onSelectOption();
			} else if (e.key === "Enter") {
				onSelectOption();
			} else if (e.key === "Escape") {
				onCloseOptionMenu();
			} else if (e.key === "Backspace") {
				if (!optionText) {
					// No text remaining
					if (optionPath.length === 0) {
						onCloseOptionMenu();
						return; // don't prevent defaults (backspaces the @ symbol)
					} else {
						onRemoveOption();
					}
				} else if (isCommandKeyPressed) {
					// Ctrl+Backspace
					onPathTextChange("");
				} else {
					// Backspace
					onPathTextChange(optionText.slice(0, -1));
				}
			} else if (e.key.length === 1) {
				if (isCommandKeyPressed) {
					// Ctrl+letter
					// do nothing
				} else {
					// letter
					if (isTypingEnabled) {
						onPathTextChange(optionText + e.key);
					}
				}
			}

			e.preventDefault();
			e.stopPropagation();
		};

		// scroll the selected optionIdx into view on optionIdx and optionText changes
		useEffect(() => {
			if (isMenuOpen && selectedOptionRef.current) {
				selectedOptionRef.current.scrollIntoView({
					behavior: "instant",
					block: "nearest",
					inline: "nearest",
				});
			}
		}, [optionIdx, isMenuOpen, optionText, selectedOptionRef]);

		const measureRef = useRef<HTMLDivElement>(null);
		const gapPx = 2;
		const offsetPx = 2;
		const { x, y, strategy, refs, middlewareData, update } = useFloating({
			open: isMenuOpen,
			onOpenChange: setIsMenuOpen,
			placement: "bottom",

			middleware: [
				offset({ mainAxis: gapPx, crossAxis: offsetPx }),
				flip({
					boundary: document.body,
					padding: 8,
				}),
				shift({
					boundary: document.body,
					padding: 8,
				}),
				size({
					apply({ elements, rects }) {
						// Just set width on the floating element and let content handle scrolling
						Object.assign(elements.floating.style, {
							width: `${Math.max(
								rects.reference.width,
								measureRef.current?.offsetWidth ?? 0
							)}px`,
						});
					},
					padding: 8,
					// Use viewport as boundary instead of any parent element
					boundary: document.body,
				}),
			],
			whileElementsMounted: autoUpdate,
			strategy: "fixed",
		});
		useEffect(() => {
			if (!isMenuOpen) return;

			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as Node;
				const floating = refs.floating.current;
				const reference = refs.reference.current;

				// Check if reference is an HTML element before using contains
				const isReferenceHTMLElement = reference && "contains" in reference;

				if (
					floating &&
					(!isReferenceHTMLElement || !reference.contains(target)) &&
					!floating.contains(target)
				) {
					setIsMenuOpen(false);
				}
			};

			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}, [isMenuOpen, refs.floating, refs.reference]);
		// logic for @ to mention ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

		const [isEnabled, setEnabled] = useState(true);

		const adjustHeight = useCallback(() => {
			const r = textAreaRef.current;
			if (!r) return;

			r.style.height = "auto"; // set to auto to reset height, then set to new height

			if (r.scrollHeight === 0) return requestAnimationFrame(adjustHeight);
			const h = r.scrollHeight;
			const newHeight = Math.min(h + 1, 500); // plus one to avoid scrollbar appearing when it shouldn't
			r.style.height = `${newHeight}px`;
		}, []);

		const fns: TextAreaFns = useMemo(
			() => ({
				setValue: (val) => {
					const r = textAreaRef.current;
					if (!r) return;
					r.value = val;
					onChangeText?.(r.value);
					adjustHeight();
				},
				enable: () => {
					setEnabled(true);
				},
				disable: () => {
					setEnabled(false);
				},
			}),
			[onChangeText, adjustHeight]
		);

		useEffect(() => {
			if (initValue) fns.setValue(initValue);
		}, [initValue]);

		return (
			<>
				<textarea
					autoFocus={false}
					ref={useCallback(
						(r: HTMLTextAreaElement | null) => {
							if (fnsRef) fnsRef.current = fns;

							refs.setReference(r);

							textAreaRef.current = r;
							if (typeof ref === "function") ref(r);
							else if (ref) ref.current = r;
							adjustHeight();
						},
						[fnsRef, fns, setEnabled, adjustHeight, ref, refs]
					)}
					onFocus={onFocus}
					onBlur={onBlur}
					disabled={!isEnabled}
					className={`w-full resize-none max-h-[500px] overflow-y-auto text-void-fg-1 placeholder:text-void-fg-3 ${className}`}
					style={{
						// defaultInputBoxStyles
						background: asCssVariable(inputBackground),
						color: asCssVariable(inputForeground),
						// inputBorder: asCssVariable(inputBorder),
					}}
					onPaste={onPaste}
					onInput={useCallback(
						(event: React.FormEvent<HTMLTextAreaElement>) => {
							const latestChange = (event.nativeEvent as InputEvent).data;

							if (latestChange === "@") {
								onOpenOptionMenu();
							}
						},
						[onOpenOptionMenu, accessor]
					)}
					onChange={useCallback(
						(e: React.ChangeEvent<HTMLTextAreaElement>) => {
							const r = textAreaRef.current;
							if (!r) return;
							onChangeText?.(r.value);
							adjustHeight();
						},
						[onChangeText, adjustHeight]
					)}
					onKeyDown={useCallback(
						(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
							if (isMenuOpen) {
								onMenuKeyDown(e);
								return;
							}

							if (e.key === "Backspace") {
								// TODO allow user to undo this.
								if (
									!e.currentTarget.value ||
									(e.currentTarget.selectionStart === 0 &&
										e.currentTarget.selectionEnd === 0)
								) {
									// if there is no text or cursor is at position 0, remove a selection
									if (e.metaKey || e.ctrlKey) {
										// Ctrl+Backspace = remove all
										chatThreadService.popStagingSelections(
											Number.MAX_SAFE_INTEGER
										);
									} else {
										// Backspace = pop 1 selection
										chatThreadService.popStagingSelections(1);
									}
									return;
								}
							}
							if (e.key === "Enter") {
								// Shift + Enter when multiline = newline
								const shouldAddNewline = e.shiftKey && multiline;
								if (!shouldAddNewline) e.preventDefault(); // prevent newline from being created
							}
							onKeyDown?.(e);
						},
						[onKeyDown, onMenuKeyDown, multiline]
					)}
					rows={1}
					placeholder={placeholder}
				/>
				{/* <div>{`idx ${optionIdx}`}</div> */}
				{isMenuOpen && (
					<div
						ref={refs.setFloating}
						className="z-[100] border-void-border-3 bg-void-bg-2-alt border rounded-md shadow-lg flex flex-col overflow-hidden p-[2px]"
						style={{
							position: strategy,
							top: y ?? 0,
							left: x ?? 0,
							width:
								refs.reference.current instanceof HTMLElement
									? refs.reference.current.offsetWidth
									: 0,
						}}
						onWheel={(e) => e.stopPropagation()}
					>
						{/* Breadcrumbs Header */}
						{isBreadcrumbsShowing && (
							<div className="px-2 py-1 text-void-fg-1 bg-void-bg-2-alt border-b border-void-border-3 sticky top-0 bg-void-bg-1 z-10 select-none pointer-events-none">
								{optionText ? (
									<div className="flex items-center">
										{/* {optionPath.map((path, index) => (
								<React.Fragment key={index}>
									<span>{path}</span>
									<ChevronRight size={12} className="mx-1" />
								</React.Fragment>
							))} */}
										<span>{optionText}</span>
									</div>
								) : (
									<div className="opacity-50">Enter text to filter...</div>
								)}
							</div>
						)}

						{/* Options list */}
						<div className="max-h-[400px] w-full max-w-full overflow-y-auto overflow-x-auto ">
							<div className="w-max min-w-full flex flex-col gap-0 text-nowrap flex-nowrap">
								{options.length === 0 ? (
									<div className="text-void-fg-3 px-3 py-0.5">
										No results found
									</div>
								) : (
									options.map((o, oIdx) => {
										return (
											// Option
											<div
												ref={oIdx === optionIdx ? selectedOptionRef : null}
												key={o.fullName}
												className={`
											flex items-center gap-2 rounded-md
											px-3 py-[2px] cursor-pointer
											${oIdx === optionIdx
														? "bg-ide-selection-color text-white/80"
														: "bg-void-bg-2-alt text-void-fg-1"
													}
										`}
												onClick={() => {
													onSelectOption();
												}}
												onMouseMove={() => {
													setOptionIdx(oIdx);
												}}
											>
												{<o.iconInMenu size={12} />}

												<span>{o.abbreviatedName}</span>

												{o.fullName && o.fullName !== o.abbreviatedName && (
													<span className="opacity-60 text-sm">
														{o.fullName}
													</span>
												)}

												{o.nextOptions || o.generateNextOptions ? (
													<ChevronRight size={12} />
												) : null}
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				)}
			</>
		);
	}
);
