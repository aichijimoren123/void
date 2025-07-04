
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
import { SmallProseWrapper } from './ProseWrapper.js';



export const EditToolChildren = ({ uri, code, type }: { uri: URI | undefined, code: string, type: 'diff' | 'rewrite' }) => {

	const content = type === 'diff' ?
		<VoidDiffEditor uri={uri} searchReplaceBlocks={code} />
		: <ChatMarkdownRender string={`\`\`\`\n${code}\n\`\`\``} codeURI={uri} chatMessageLocation={undefined} />

	return <div className='!select-text cursor-auto'>
		<SmallProseWrapper>
			{content}
		</SmallProseWrapper>
	</div>

}
