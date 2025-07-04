/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, Fragment, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';
import { useAccessor, useActiveURI, useChatThreadsState, useChatThreadsStreamState, useCommandBarState, useFullChatThreadsStreamState, useSettingsState } from '../util/services.js';

import { AlertTriangle, Ban, Check, ChevronRight, CircleEllipsis, File, Folder, ImageIcon, Pencil, Text, X } from 'lucide-react';
import { URI } from '../../../../../../../base/common/uri.js';
import { ChatMode, FeatureName, isFeatureNameDisabled } from '../../../../common/voidSettingsTypes.js';
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
import { openFileFn } from './utils.js';
import { ToolChildrenWrapper } from './ToolChildrenWrapper.js';
import { ProseWrapper, SmallProseWrapper } from './ProseWrapper.js';

const ReasoningWrapper = ({ isDoneReasoning, isStreaming, children }: { isDoneReasoning: boolean, isStreaming: boolean, children: React.ReactNode }) => {
	const isDone = isDoneReasoning || !isStreaming
	const isWriting = !isDone
	const [isOpen, setIsOpen] = useState(isWriting)
	useEffect(() => {
		if (!isWriting) setIsOpen(false) // if just finished reasoning, close
	}, [isWriting])
	return <ToolHeaderWrapper title='Reasoning' desc1={isWriting ? <IconLoading /> : ''} isOpen={isOpen} onClick={() => setIsOpen(v => !v)}>
		<ToolChildrenWrapper>
			<div className='!select-text cursor-auto'>
				{children}
			</div>
		</ToolChildrenWrapper>
	</ToolHeaderWrapper>
}


export const AssistantMessageComponent = ({ chatMessage, isCheckpointGhost, isCommitted, messageIdx }: { chatMessage: ChatMessage & { role: 'assistant' }, isCheckpointGhost: boolean, messageIdx: number, isCommitted: boolean }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	const reasoningStr = chatMessage.reasoning?.trim() || null
	const hasReasoning = !!reasoningStr
	const isDoneReasoning = !!chatMessage.displayContent
	const thread = chatThreadsService.getCurrentThread()


	const chatMessageLocation: ChatMessageLocation = {
		threadId: thread.id,
		messageIdx: messageIdx,
	}

	const isEmpty = !chatMessage.displayContent && !chatMessage.reasoning
	if (isEmpty) return null

	return <>
		{/* reasoning token */}
		{hasReasoning &&
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ReasoningWrapper isDoneReasoning={isDoneReasoning} isStreaming={!isCommitted}>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={reasoningStr}
							chatMessageLocation={chatMessageLocation}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true}
						/>
					</SmallProseWrapper>
				</ReasoningWrapper>
			</div>
		}

		{/* assistant message */}
		{chatMessage.displayContent &&
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ProseWrapper>
					<ChatMarkdownRender
						string={chatMessage.displayContent || ''}
						chatMessageLocation={chatMessageLocation}
						isApplyEnabled={true}
						isLinkDetectionEnabled={true}
					/>
				</ProseWrapper>
			</div>
		}
	</>

}
