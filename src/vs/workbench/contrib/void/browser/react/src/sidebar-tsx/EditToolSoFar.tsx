/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, Fragment, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';
import { useAccessor, useActiveURI, useChatThreadsState, useChatThreadsStreamState, useCommandBarState, useFullChatThreadsStreamState, useSettingsState } from '../util/services.js';

import { AlertTriangle, Ban, Check, ChevronRight, CircleEllipsis, File, Folder, ImageIcon, Pencil, Text, X } from 'lucide-react';
import { URI } from '../../../../../../../base/common/uri.js';
import { ChatMode, FeatureName, isFeatureNameDisabled } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js';
import { ChatMessage, CheckpointEntry, StagingSelectionItem, ToolMessage } from '../../../../common/chatThreadServiceTypes.js';
import { getIsReasoningEnabledState, getModelCapabilities } from '../../../../common/modelCapabilities.js';
import { builtinToolNames, isABuiltinToolName, MAX_FILE_CHARS_PAGE } from '../../../../common/prompt/prompts.js';
import { RawToolCallObj } from '../../../../common/sendLLMMessageTypes.js';
import { approvalTypeOfBuiltinToolName, BuiltinToolCallParams, BuiltinToolName, LintErrorItem, ToolName } from '../../../../common/toolsServiceTypes.js';
import { VOID_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { IsRunningType } from '../../../chatThreadService.js';
import { TAYCAN_OPEN_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js';
import { CopyButton, EditToolAcceptRejectButtonsHTML, IconShell1, StatusIndicator, useEditToolStreamState } from '../markdown/ApplyBlockHoverButtons.js';
import { ChatMarkdownRender, ChatMessageLocation, getApplyBoxId } from '../markdown/ChatMarkdownRender.js';
import { BlockCode, TextAreaFns, VoidCustomDropdownBox, VoidDiffEditor, VoidInputBox2, VoidSlider, VoidSwitch } from '../util/inputs.js';
import { ModelDropdown, } from '../void-settings-tsx/ModelDropdown.js';
import { ToolApprovalTypeSwitch } from '../void-settings-tsx/Settings.js';
import { WarningBox } from '../void-settings-tsx/WarningBox.js';
import ErrorBoundary from './ErrorBoundary.js';
import { ErrorDisplay } from './ErrorDisplay.js';
import { PastThreadsList } from './SidebarThreadSelector.js';

import { removeMCPToolNamePrefix } from '../../../../common/mcpServiceTypes.js';
import { persistentTerminalNameOfId } from '../../../terminalToolService.js';
import { IconArrowUp, IconLoading, IconSquare, IconX } from './Icons.js';
import { CommandBarInChat } from './CommandBarInChat.js';
import { ChatArea } from './ChatArea.js';
import { ToolHeaderParams, ToolHeaderWrapper } from './ToolHeaderWrapper.js';
import { SelectedFiles } from './SelectedFiles.js';
import { getBasename, getFolderName, getRelative, openFileFn, titleOfBuiltinToolName } from './utils.js';
import { ProseWrapper, SmallProseWrapper } from './ProseWrapper.js';
import { BottomChildren } from './BottomChildren.js';
import { CodeChildren } from './CodeChildren.js';
import { ChatBubble } from './ChatBubble.js';
import { EditToolChildren } from './EditToolChildren.js';

export const EditToolSoFar = ({ toolCallSoFar, }: { toolCallSoFar: RawToolCallObj }) => {

	if (!isABuiltinToolName(toolCallSoFar.name)) return null

	const accessor = useAccessor()

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed

	const uriDone = toolCallSoFar.doneParams.includes('uri')
	const desc1 = <span className='flex items-center'>
		{uriDone ?
			getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown')
			: `Generating`}
		<IconLoading />
	</span>

	const desc1OnClick = () => { uri && openFileFn(uri, accessor) }

	// If URI has not been specified
	return <ToolHeaderWrapper
		title={title}
		desc1={desc1}
		desc1OnClick={desc1OnClick}
	>
		<EditToolChildren
			uri={uri}
			code={toolCallSoFar.rawParams.search_replace_blocks ?? toolCallSoFar.rawParams.new_content ?? ''}
			type={'rewrite'} // as it streams, show in rewrite format, don't make a diff editor
		/>
		<IconLoading />
	</ToolHeaderWrapper>

}
