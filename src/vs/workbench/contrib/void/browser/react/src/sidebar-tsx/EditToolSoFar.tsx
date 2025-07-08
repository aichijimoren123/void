import { useAccessor } from "../util/services.js";
import { URI } from "../../../../../../../base/common/uri.js";
import { isABuiltinToolName } from "../../../../common/prompt/prompts.js";
import { RawToolCallObj } from "../../../../common/sendLLMMessageTypes.js";
import { IconLoading } from "./Icons.js";
import { ToolHeaderWrapper } from "./ToolHeaderWrapper.js";
import { getBasename, openFileFn, titleOfBuiltinToolName } from "./utils.js";
import { EditToolChildren } from "./EditToolChildren.js";

export const EditToolSoFar = ({
	toolCallSoFar,
}: {
	toolCallSoFar: RawToolCallObj;
}) => {
	if (!isABuiltinToolName(toolCallSoFar.name)) return null;

	const accessor = useAccessor();

	const uri = toolCallSoFar.rawParams.uri
		? URI.file(toolCallSoFar.rawParams.uri)
		: undefined;

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed;

	const uriDone = toolCallSoFar.doneParams.includes("uri");
	const desc1 = (
		<span className="flex items-center">
			{uriDone
				? getBasename(toolCallSoFar.rawParams["uri"] ?? "unknown")
				: `Generating`}
			<IconLoading />
		</span>
	);

	const desc1OnClick = () => {
		uri && openFileFn(uri, accessor);
	};

	// If URI has not been specified
	return (
		<ToolHeaderWrapper title={title} desc1={desc1} desc1OnClick={desc1OnClick}>
			<EditToolChildren
				uri={uri}
				code={
					toolCallSoFar.rawParams.search_replace_blocks ??
					toolCallSoFar.rawParams.new_content ??
					""
				}
				type={"rewrite"} // as it streams, show in rewrite format, don't make a diff editor
			/>
			<IconLoading />
		</ToolHeaderWrapper>
	);
};
