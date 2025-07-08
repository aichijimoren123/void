import { useAccessor } from "../util/services.js";
import { URI } from "../../../../../../../base/common/uri.js";
import {
	CopyButton,
	EditToolAcceptRejectButtonsHTML,
	useEditToolStreamState,
} from "../markdown/ApplyBlockHoverButtons.js";
import { getApplyBoxId } from "../markdown/ChatMarkdownRender.js";
import { ToolHeaderParams, ToolHeaderWrapper } from "./ToolHeaderWrapper.js";
import { getTitle, openFileFn } from "./utils.js";
import { toolNameToDesc } from "./ToolNameToDesc.js";
import { ToolChildrenWrapper } from "./ToolChildrenWrapper.js";
import { EditToolChildren } from "./EditToolChildren.js";
import { BottomChildren } from "./BottomChildren.js";
import { ResultWrapper } from "./BuiltInToolNameToComponent.js";
import { CodeChildren } from "./CodeChildren.js";

const EditToolHeaderButtons = ({
	applyBoxId,
	uri,
	codeStr,
	toolName,
	threadId,
}: {
	threadId: string;
	applyBoxId: string;
	uri: URI;
	codeStr: string;
	toolName: "edit_file" | "rewrite_file";
}) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri });
	return (
		<div className="flex items-center gap-1">
			{/* <StatusIndicatorForApplyButton applyBoxId={applyBoxId} uri={uri} /> */}
			{/* <JumpToFileButton uri={uri} /> */}
			{streamState === "idle-no-changes" && (
				<CopyButton codeStr={codeStr} toolTipName="Copy" />
			)}
			<EditToolAcceptRejectButtonsHTML
				type={toolName}
				codeStr={codeStr}
				applyBoxId={applyBoxId}
				uri={uri}
				threadId={threadId}
			/>
		</div>
	);
};

export const EditTool = ({
	toolMessage,
	threadId,
	messageIdx,
	content,
}: Parameters<ResultWrapper<"edit_file" | "rewrite_file">>[0] & {
	content: string;
}) => {
	const accessor = useAccessor();
	const isError = false;
	const isRejected = toolMessage.type === "rejected";

	const title = getTitle(toolMessage);

	const { desc1, desc1Info } = toolNameToDesc(
		toolMessage.name,
		toolMessage.params,
		accessor
	);
	const icon = null;

	const { rawParams, params, name } = toolMessage;
	const desc1OnClick = () => openFileFn(params.uri, accessor);
	const componentParams: ToolHeaderParams = {
		title,
		desc1,
		desc1OnClick,
		desc1Info,
		isError,
		icon,
		isRejected,
	};

	const editToolType = toolMessage.name === "edit_file" ? "diff" : "rewrite";
	if (
		toolMessage.type === "running_now" ||
		toolMessage.type === "tool_request"
	) {
		componentParams.children = (
			<ToolChildrenWrapper className="bg-void-bg-3">
				<EditToolChildren uri={params.uri} code={content} type={editToolType} />
			</ToolChildrenWrapper>
		);
		// JumpToFileButton removed in favor of FileLinkText
	} else if (
		toolMessage.type === "success" ||
		toolMessage.type === "rejected" ||
		toolMessage.type === "tool_error"
	) {
		// add apply box
		const applyBoxId = getApplyBoxId({
			threadId: threadId,
			messageIdx: messageIdx,
			tokenIdx: "N/A",
		});
		componentParams.desc2 = (
			<EditToolHeaderButtons
				applyBoxId={applyBoxId}
				uri={params.uri}
				codeStr={content}
				toolName={name}
				threadId={threadId}
			/>
		);

		// add children
		componentParams.children = (
			<ToolChildrenWrapper className="bg-void-bg-3">
				<EditToolChildren uri={params.uri} code={content} type={editToolType} />
			</ToolChildrenWrapper>
		);

		if (toolMessage.type === "success" || toolMessage.type === "rejected") {
			const { result } = toolMessage;
			componentParams.bottomChildren = (
				<BottomChildren title="Lint errors">
					{result?.lintErrors?.map((error, i) => (
						<div key={i} className="whitespace-nowrap">
							Lines {error.startLineNumber}-{error.endLineNumber}:{" "}
							{error.message}
						</div>
					))}
				</BottomChildren>
			);
		} else if (toolMessage.type === "tool_error") {
			// error
			const { result } = toolMessage;
			componentParams.bottomChildren = (
				<BottomChildren title="Error">
					<CodeChildren>{result}</CodeChildren>
				</BottomChildren>
			);
		}
	}

	return <ToolHeaderWrapper {...componentParams} />;
};
