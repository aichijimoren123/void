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
import { getBasename, getFolderName, getRelative, getTitle, openFileFn } from './utils.js';
import { SmallProseWrapper } from './ProseWrapper.js';
import { toolNameToDesc } from './ToolNameToDesc.js';
import { ToolChildrenWrapper } from './ToolChildrenWrapper.js';
import { EditToolChildren } from './EditToolChildren.js';
import { BottomChildren } from './BottomChildren.js';
import { ResultWrapper } from './BuiltInToolNameToComponent.js';
import { CodeChildren } from './CodeChildren.js';



const EditToolHeaderButtons = ({ applyBoxId, uri, codeStr, toolName, threadId }: { threadId: string, applyBoxId: string, uri: URI, codeStr: string, toolName: 'edit_file' | 'rewrite_file' }) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri })
	return <div className='flex items-center gap-1'>
		{/* <StatusIndicatorForApplyButton applyBoxId={applyBoxId} uri={uri} /> */}
		{/* <JumpToFileButton uri={uri} /> */}
		{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName='Copy' />}
		<EditToolAcceptRejectButtonsHTML type={toolName} codeStr={codeStr} applyBoxId={applyBoxId} uri={uri} threadId={threadId} />
	</div>
}


export const EditTool = ({ toolMessage, threadId, messageIdx, content }: Parameters<ResultWrapper<'edit_file' | 'rewrite_file'>>[0] & { content: string }) => {
	const accessor = useAccessor()
	const isError = false
	const isRejected = toolMessage.type === 'rejected'

	const title = getTitle(toolMessage)

	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
	const icon = null

	const { rawParams, params, name } = toolMessage
	const desc1OnClick = () => openFileFn(params.uri, accessor)
	const componentParams: ToolHeaderParams = { title, desc1, desc1OnClick, desc1Info, isError, icon, isRejected, }


	const editToolType = toolMessage.name === 'edit_file' ? 'diff' : 'rewrite'
	if (toolMessage.type === 'running_now' || toolMessage.type === 'tool_request') {
		componentParams.children = <ToolChildrenWrapper className='bg-void-bg-3'>
			<EditToolChildren
				uri={params.uri}
				code={content}
				type={editToolType}
			/>
		</ToolChildrenWrapper>
		// JumpToFileButton removed in favor of FileLinkText
	}
	else if (toolMessage.type === 'success' || toolMessage.type === 'rejected' || toolMessage.type === 'tool_error') {
		// add apply box
		const applyBoxId = getApplyBoxId({
			threadId: threadId,
			messageIdx: messageIdx,
			tokenIdx: 'N/A',
		})
		componentParams.desc2 = <EditToolHeaderButtons
			applyBoxId={applyBoxId}
			uri={params.uri}
			codeStr={content}
			toolName={name}
			threadId={threadId}
		/>

		// add children
		componentParams.children = <ToolChildrenWrapper className='bg-void-bg-3'>
			<EditToolChildren
				uri={params.uri}
				code={content}
				type={editToolType}
			/>
		</ToolChildrenWrapper>

		if (toolMessage.type === 'success' || toolMessage.type === 'rejected') {
			const { result } = toolMessage
			componentParams.bottomChildren = <BottomChildren title='Lint errors'>
				{result?.lintErrors?.map((error, i) => (
					<div key={i} className='whitespace-nowrap'>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
				))}
			</BottomChildren>
		}
		else if (toolMessage.type === 'tool_error') {
			// error
			const { result } = toolMessage
			componentParams.bottomChildren = <BottomChildren title='Error'>
				<CodeChildren>
					{result}
				</CodeChildren>
			</BottomChildren>
		}
	}

	return <ToolHeaderWrapper {...componentParams} />
}
