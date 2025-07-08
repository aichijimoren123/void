/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useMemo, useRef } from "react";
import { DiffEditorWidget } from "../../../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js";
import {
	ExtractedSearchReplaceBlock,
	extractSearchReplaceBlocks,
} from "../../../../common/helpers/extractCodeFromResult.js";
import { detectLanguage } from "../../../../common/helpers/languageHelpers.js";
import { useAccessor } from "./services.js";

const SingleDiffEditor = ({
	block,
	lang,
}: {
	block: ExtractedSearchReplaceBlock;
	lang: string | undefined;
}) => {
	const accessor = useAccessor();
	const modelService = accessor.get("IModelService");
	const instantiationService = accessor.get("IInstantiationService");
	const languageService = accessor.get("ILanguageService");

	const languageSelection = useMemo(
		() => languageService.createById(lang),
		[lang, languageService]
	);

	// Create models for original and modified
	const originalModel = useMemo(
		() => modelService.createModel(block.orig, languageSelection),
		[block.orig, languageSelection, modelService]
	);
	const modifiedModel = useMemo(
		() => modelService.createModel(block.final, languageSelection),
		[block.final, languageSelection, modelService]
	);

	// Clean up models on unmount
	useEffect(() => {
		return () => {
			originalModel.dispose();
			modifiedModel.dispose();
		};
	}, [originalModel, modifiedModel]);

	// Imperatively mount the DiffEditorWidget
	const divRef = useRef<HTMLDivElement | null>(null);
	const editorRef = useRef<any>(null);

	useEffect(() => {
		if (!divRef.current) return;
		// Create the diff editor instance
		const editor = instantiationService.createInstance(
			DiffEditorWidget,
			divRef.current,
			{
				automaticLayout: true,
				readOnly: true,
				renderSideBySide: true,
				minimap: { enabled: false },
				lineNumbers: "off",
				scrollbar: {
					vertical: "hidden",
					horizontal: "auto",
					verticalScrollbarSize: 0,
					horizontalScrollbarSize: 8,
					alwaysConsumeMouseWheel: false,
					ignoreHorizontalScrollbarInContentHeight: true,
				},
				hover: { enabled: false },
				folding: false,
				selectionHighlight: false,
				renderLineHighlight: "none",
				overviewRulerLanes: 0,
				hideCursorInOverviewRuler: true,
				overviewRulerBorder: false,
				glyphMargin: false,
				stickyScroll: { enabled: false },
				scrollBeyondLastLine: false,
				renderGutterMenu: false,
				renderIndicators: false,
			},
			{
				originalEditor: { isSimpleWidget: true },
				modifiedEditor: { isSimpleWidget: true },
			}
		);
		editor.setModel({ original: originalModel, modified: modifiedModel });

		// Calculate the height based on content
		const updateHeight = () => {
			const contentHeight =
				Math.max(
					originalModel.getLineCount() * 19, // approximate line height
					modifiedModel.getLineCount() * 19
				) +
				19 * 2 +
				1; // add padding

			// Set reasonable min/max heights
			const height = Math.min(Math.max(contentHeight, 100), 300);
			if (divRef.current) {
				divRef.current.style.height = `${height}px`;
				editor.layout();
			}
		};

		updateHeight();
		editorRef.current = editor;

		// Update height when content changes
		const disposable1 = originalModel.onDidChangeContent(() => updateHeight());
		const disposable2 = modifiedModel.onDidChangeContent(() => updateHeight());

		return () => {
			disposable1.dispose();
			disposable2.dispose();
			editor.dispose();
			editorRef.current = null;
		};
	}, [originalModel, modifiedModel, instantiationService]);

	return (
		<div
			className="w-full bg-void-bg-3 @@bg-editor-style-override"
			ref={divRef}
		/>
	);
};

/**
 * ToolDiffEditor mounts a native VSCode DiffEditorWidget to show a diff between original and modified code blocks.
 * Props:
 *   - uri: URI of the file (for language detection, etc)
 *   - searchReplaceBlocks: string in search/replace format (from LLM)
 *   - language?: string (optional, fallback to 'plaintext')
 */
export const TarsDiffEditor = ({
	uri,
	searchReplaceBlocks,
	language,
}: {
	uri?: any;
	searchReplaceBlocks: string;
	language?: string;
}) => {
	const accessor = useAccessor();
	const languageService = accessor.get("ILanguageService");

	// Extract all blocks
	const blocks = extractSearchReplaceBlocks(searchReplaceBlocks);

	// Use detectLanguage for language detection if not provided
	let lang = language;
	if (!lang && blocks.length > 0) {
		lang = detectLanguage(languageService, {
			uri: uri ?? null,
			fileContents: blocks[0].orig,
		});
	}

	// If no blocks, show empty state
	if (blocks.length === 0) {
		return (
			<div className="w-full p-4 text-void-fg-4 text-sm">No changes found</div>
		);
	}

	// Display all blocks
	return (
		<div className="w-full flex flex-col gap-2">
			{blocks.map((block, index) => (
				<div key={index} className="w-full">
					{blocks.length > 1 && (
						<div className="text-void-fg-4 text-xs mb-1 px-1">
							Change {index + 1} of {blocks.length}
						</div>
					)}
					<SingleDiffEditor block={block} lang={lang} />
				</div>
			))}
		</div>
	);
};
