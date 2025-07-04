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
import { getTitle, openFileFn } from './utils.js';
import { UserMessageComponent } from './UserMessage.js';
import { AssistantMessageComponent } from './AssistantMessage.js';
import { builtinToolNameToComponent } from './BuiltInToolNameToComponent.js';
import { ToolChildrenWrapper } from './ToolChildrenWrapper.js';
import { CodeChildren } from './CodeChildren.js';
import { SmallProseWrapper } from './ProseWrapper.js';
import { BottomChildren } from './BottomChildren.js';


type WrapperProps<T extends ToolName> = { toolMessage: Exclude<ToolMessage<T>, { type: 'invalid_params' }>, messageIdx: number, threadId: string }


type ResultWrapper<T extends ToolName> = (props: WrapperProps<T>) => React.ReactNode


const MCPToolWrapper = ({ toolMessage }: WrapperProps<string>) => {
	const accessor = useAccessor()
	const mcpService = accessor.get('IMCPService')

	const title = getTitle(toolMessage)
	const desc1 = removeMCPToolNamePrefix(toolMessage.name)
	const icon = null


	if (toolMessage.type === 'running_now') return null // do not show running

	const isError = false
	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon, isRejected, }

	const paramsStr = JSON.stringify(params, null, 2)
	componentParams.desc2 = <CopyButton codeStr={paramsStr} toolTipName={`Copy inputs: ${paramsStr}`} />

	componentParams.info = !toolMessage.mcpServerName ? 'MCP tool not found' : undefined

	// Add copy inputs button in desc2


	if (toolMessage.type === 'success' || toolMessage.type === 'tool_request') {
		const { result } = toolMessage
		const resultStr = result ? mcpService.stringifyResult(result) : 'null'
		componentParams.children = <ToolChildrenWrapper>
			<SmallProseWrapper>
				<ChatMarkdownRender
					string={`\`\`\`json\n${resultStr}\n\`\`\``}
					chatMessageLocation={undefined}
					isApplyEnabled={false}
					isLinkDetectionEnabled={true}
				/>
			</SmallProseWrapper>
		</ToolChildrenWrapper>
	}
	else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>
	}

	return <ToolHeaderWrapper {...componentParams} />

}

const ToolRequestAcceptRejectButtons = ({ toolName }: { toolName: ToolName }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')
	const metricsService = accessor.get('IMetricsService')
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidSettingsState = useSettingsState()

	const onAccept = useCallback(() => {
		try { // this doesn't need to be wrapped in try/catch anymore
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.approveLatestToolRequest(threadId)
			metricsService.capture('Tool Request Accepted', {})
		} catch (e) { console.error('Error while approving message in chat:', e) }
	}, [chatThreadsService, metricsService])

	const onReject = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.rejectLatestToolRequest(threadId)
		} catch (e) { console.error('Error while approving message in chat:', e) }
		metricsService.capture('Tool Request Rejected', {})
	}, [chatThreadsService, metricsService])

	const approveButton = (
		<button
			onClick={onAccept}
			className={`
				px-2 py-1
				bg-[var(--vscode-button-background)]
				text-[var(--vscode-button-foreground)]
				hover:bg-[var(--vscode-button-hoverBackground)]
				rounded
				text-sm font-medium
			`}
		>
			Approve
		</button>
	)

	const cancelButton = (
		<button
			onClick={onReject}
			className={`
				px-2 py-1
				bg-[var(--vscode-button-secondaryBackground)]
				text-[var(--vscode-button-secondaryForeground)]
				hover:bg-[var(--vscode-button-secondaryHoverBackground)]
				rounded
				text-sm font-medium
			`}
		>
			Cancel
		</button>
	)

	const approvalType = isABuiltinToolName(toolName) ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools'
	const approvalToggle = approvalType ? <div key={approvalType} className="flex items-center ml-2 gap-x-1">
		<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
	</div> : null

	return <div className="flex gap-2 mx-0.5 items-center">
		{approveButton}
		{cancelButton}
		{approvalToggle}
	</div>
}

const InvalidTool = ({ toolName, message, mcpServerName }: { toolName: ToolName, message: string, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'invalid_params', mcpServerName })
	const desc1 = 'Invalid parameters'
	const icon = null
	const isError = true
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon }

	componentParams.children = <ToolChildrenWrapper>
		<CodeChildren className='bg-void-bg-3'>
			{message}
		</CodeChildren>
	</ToolChildrenWrapper>
	return <ToolHeaderWrapper {...componentParams} />
}

const CanceledTool = ({ toolName, mcpServerName }: { toolName: ToolName, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'rejected', mcpServerName })
	const desc1 = ''
	const icon = null
	const isRejected = true
	const componentParams: ToolHeaderParams = { title, desc1, icon, isRejected }
	return <ToolHeaderWrapper {...componentParams} />
}


type ChatBubbleProps = {
	chatMessage: ChatMessage,
	messageIdx: number,
	isCommitted: boolean,
	chatIsRunning: IsRunningType,
	threadId: string,
	currCheckpointIdx: number | undefined,
	_scrollToBottom: (() => void) | null,
}

const Checkpoint = ({ message, threadId, messageIdx, isCheckpointGhost, threadIsRunning }: { message: CheckpointEntry, threadId: string; messageIdx: number, isCheckpointGhost: boolean, threadIsRunning: boolean }) => {
	const accessor = useAccessor()
	const chatThreadService = accessor.get('IChatThreadService')
	const streamState = useFullChatThreadsStreamState()

	const isRunning = useChatThreadsStreamState(threadId)?.isRunning
	const isDisabled = useMemo(() => {
		if (isRunning) return true
		return !!Object.keys(streamState).find((threadId2) => streamState[threadId2]?.isRunning)
	}, [isRunning, streamState])

	return <div
		className={`flex items-center justify-center px-2 `}
	>
		<div
			className={`
					text-xs
					text-void-fg-3
					select-none
					${isCheckpointGhost ? 'opacity-50' : 'opacity-100'}
					${isDisabled ? 'cursor-default' : 'cursor-pointer'}
				`}
			style={{ position: 'relative', display: 'inline-block' }} // allow absolute icon
			onClick={() => {
				if (threadIsRunning) return
				if (isDisabled) return
				chatThreadService.jumpToCheckpointBeforeMessageIdx({
					threadId,
					messageIdx,
					jumpToUserModified: messageIdx === (chatThreadService.state.allThreads[threadId]?.messages.length ?? 0) - 1
				})
			}}
			{...isDisabled ? {
				'data-tooltip-id': 'void-tooltip',
				'data-tooltip-content': `Disabled ${isRunning ? 'when running' : 'because another thread is running'}`,
				'data-tooltip-place': 'top',
			} : {}}
		>
			Checkpoint
		</div>
	</div>
}




const _ChatBubble = ({ threadId, chatMessage, currCheckpointIdx, isCommitted, messageIdx, chatIsRunning, _scrollToBottom }: ChatBubbleProps) => {
	const role = chatMessage.role

	const isCheckpointGhost = messageIdx > (currCheckpointIdx ?? Infinity) && !chatIsRunning // whether to show as gray (if chat is running, for good measure just dont show any ghosts)

	if (role === 'user') {
		return <UserMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			currCheckpointIdx={currCheckpointIdx}
			messageIdx={messageIdx}
			_scrollToBottom={_scrollToBottom}
		/>
	}
	else if (role === 'assistant') {
		return <AssistantMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			messageIdx={messageIdx}
			isCommitted={isCommitted}
		/>
	}
	else if (role === 'tool') {

		if (chatMessage.type === 'invalid_params') {
			return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<InvalidTool toolName={chatMessage.name} message={chatMessage.content} mcpServerName={chatMessage.mcpServerName} />
			</div>
		}

		const toolName = chatMessage.name
		const isBuiltInTool = isABuiltinToolName(toolName)
		const ToolResultWrapper = isBuiltInTool ? builtinToolNameToComponent[toolName]?.resultWrapper as ResultWrapper<ToolName>
			: MCPToolWrapper as ResultWrapper<ToolName>

		if (ToolResultWrapper)
			return <>
				<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<ToolResultWrapper
						toolMessage={chatMessage}
						messageIdx={messageIdx}
						threadId={threadId}
					/>
				</div>
				{chatMessage.type === 'tool_request' ?
					<div className={`${isCheckpointGhost ? 'opacity-50 pointer-events-none' : ''}`}>
						<ToolRequestAcceptRejectButtons toolName={chatMessage.name} />
					</div> : null}
			</>
		return null
	}

	else if (role === 'interrupted_streaming_tool') {
		return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
			<CanceledTool toolName={chatMessage.name} mcpServerName={chatMessage.mcpServerName} />
		</div>
	}

	else if (role === 'checkpoint') {
		return <Checkpoint
			threadId={threadId}
			message={chatMessage}
			messageIdx={messageIdx}
			isCheckpointGhost={isCheckpointGhost}
			threadIsRunning={!!chatIsRunning}
		/>
	}

}


export const ChatBubble = (props: ChatBubbleProps) => {
	return <ErrorBoundary>
		<_ChatBubble {...props} />
	</ErrorBoundary>
}
