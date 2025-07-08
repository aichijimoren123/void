/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useId, useRef } from "react";
import { CodeEditorWidget } from "../../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js";
import { ITextModel } from "../../../../../../../editor/common/model.js";
import { useAccessor } from "./services.js";
import { WidgetComponent } from "./Widget.js";

// makes it so that code in the sidebar isnt too tabbed out
const normalizeIndentation = (code: string): string => {
	const lines = code.split("\n");

	let minLeadingSpaces = Infinity;

	// find the minimum number of leading spaces
	for (const line of lines) {
		if (line.trim() === "") continue;
		let leadingSpaces = 0;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === "\t" || char === " ") {
				leadingSpaces += 1;
			} else {
				break;
			}
		}
		minLeadingSpaces = Math.min(minLeadingSpaces, leadingSpaces);
	}

	// remove the leading spaces
	return lines
		.map((line) => {
			if (line.trim() === "") return line;

			let spacesToRemove = minLeadingSpaces;
			let i = 0;
			while (spacesToRemove > 0 && i < line.length) {
				const char = line[i];
				if (char === "\t" || char === " ") {
					spacesToRemove -= 1;
					i++;
				} else {
					break;
				}
			}

			return line.slice(i);
		})
		.join("\n");
};

const modelOfEditorId: { [id: string]: ITextModel | undefined } = {};
export type BlockCodeProps = {
	initValue: string;
	language?: string;
	maxHeight?: number;
	showScrollbars?: boolean;
};
export const BlockCode = ({
	initValue,
	language,
	maxHeight,
	showScrollbars,
}: BlockCodeProps) => {
	initValue = normalizeIndentation(initValue);

	// default settings
	const MAX_HEIGHT = maxHeight ?? Infinity;
	const SHOW_SCROLLBARS = showScrollbars ?? false;

	const divRef = useRef<HTMLDivElement | null>(null);

	const accessor = useAccessor();
	const instantiationService = accessor.get("IInstantiationService");
	// const languageDetectionService = accessor.get('ILanguageDetectionService')
	const modelService = accessor.get("IModelService");

	const id = useId();

	// these are used to pass to the model creation of modelRef
	const initValueRef = useRef(initValue);
	const languageRef = useRef(language);

	const modelRef = useRef<ITextModel | null>(null);

	// if we change the initial value, don't re-render the whole thing, just set it here. same for language
	useEffect(() => {
		initValueRef.current = initValue;
		modelRef.current?.setValue(initValue);
	}, [initValue]);
	useEffect(() => {
		languageRef.current = language;
		if (language) modelRef.current?.setLanguage(language);
	}, [language]);

	return (
		<div ref={divRef} className="relative z-0 px-2 py-1 bg-void-bg-3">
			<WidgetComponent
				className="@@bg-editor-style-override" // text-sm
				ctor={useCallback(
					(container) => {
						return instantiationService.createInstance(
							CodeEditorWidget,
							container,
							{
								automaticLayout: true,
								wordWrap: "off",

								scrollbar: {
									alwaysConsumeMouseWheel: false,
									...(SHOW_SCROLLBARS
										? {
											vertical: "auto",
											verticalScrollbarSize: 8,
											horizontal: "auto",
											horizontalScrollbarSize: 8,
										}
										: {
											vertical: "hidden",
											verticalScrollbarSize: 0,
											horizontal: "auto",
											horizontalScrollbarSize: 8,
											ignoreHorizontalScrollbarInContentHeight: true,
										}),
								},
								scrollBeyondLastLine: false,

								lineNumbers: "off",

								readOnly: true,
								domReadOnly: true,
								readOnlyMessage: { value: "" },

								minimap: {
									enabled: false,
									// maxColumn: 0,
								},

								hover: { enabled: false },

								selectionHighlight: false, // highlights whole words
								renderLineHighlight: "none",

								folding: false,
								lineDecorationsWidth: 0,
								overviewRulerLanes: 0,
								hideCursorInOverviewRuler: true,
								overviewRulerBorder: false,
								glyphMargin: false,

								stickyScroll: {
									enabled: false,
								},
							},
							{
								isSimpleWidget: true,
							}
						);
					},
					[instantiationService]
				)}
				onCreateInstance={useCallback(
					(editor: CodeEditorWidget) => {
						const languageId = languageRef.current
							? languageRef.current
							: "plaintext";

						const model =
							modelOfEditorId[id] ??
							modelService.createModel(initValueRef.current, {
								languageId: languageId,
								onDidChange: (e) => {
									return { dispose: () => { } };
								}, // no idea why they'd require this
							});
						modelRef.current = model;
						editor.setModel(model);

						const container = editor.getDomNode();
						const parentNode = container?.parentElement;
						const resize = () => {
							const height = editor.getScrollHeight() + 1;
							if (parentNode) {
								// const height = Math.min(, MAX_HEIGHT);
								parentNode.style.height = `${height}px`;
								parentNode.style.maxHeight = `${MAX_HEIGHT}px`;
								editor.layout();
							}
						};

						resize();
						const disposable = editor.onDidContentSizeChange(() => {
							resize();
						});

						return [disposable, model];
					},
					[modelService]
				)}
				dispose={useCallback(
					(editor: CodeEditorWidget) => {
						editor.dispose();
					},
					[modelService]
				)}
				propsFn={useCallback(() => {
					return [];
				}, [])}
			/>
		</div>
	);
};
