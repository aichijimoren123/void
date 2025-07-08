import { URI } from "../../../../../../../base/common/uri.js";
import { ChatMarkdownRender } from "../markdown/ChatMarkdownRender.js";
import { TarsDiffEditor } from '../util/DiffEditor.js';
import { SmallProseWrapper } from "./ProseWrapper.js";

export const EditToolChildren = ({
	uri,
	code,
	type,
}: {
	uri: URI | undefined;
	code: string;
	type: "diff" | "rewrite";
}) => {
	const content =
		type === "diff" ? (
			<TarsDiffEditor uri={uri} searchReplaceBlocks={code} />
		) : (
			<ChatMarkdownRender
				string={`\`\`\`\n${code}\n\`\`\``}
				codeURI={uri}
				chatMessageLocation={undefined}
			/>
		);

	return (
		<div className="!select-text cursor-auto">
			<SmallProseWrapper>{content}</SmallProseWrapper>
		</div>
	);
};
