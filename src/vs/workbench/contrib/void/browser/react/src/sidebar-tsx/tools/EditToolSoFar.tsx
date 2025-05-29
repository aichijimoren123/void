import { URI } from '../../../../../../../../base/common/uri.js'
import { RawToolCallObj } from '../../../../../common/sendLLMMessageTypes.js'
import { useAccessor } from '../../util/services.js'
import { IconLoading } from '../Icons.js'
import { getBasename, titleOfToolName, voidOpenFileFn } from '../utils.js'
import { EditToolChildren } from './EditTool.js'
import { ToolHeaderWrapper } from './ToolHeader.js'

export const EditToolSoFar = ({ toolCallSoFar, }: { toolCallSoFar: RawToolCallObj }) => {


	const accessor = useAccessor()

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined

	const title = titleOfToolName[toolCallSoFar.name].proposed

	const uriDone = toolCallSoFar.doneParams.includes('uri')
	const desc1 = <span className='flex items-center'>
		{uriDone ?
			getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown')
			: `Generating`}
		<IconLoading />
	</span>

	const desc1OnClick = () => { uri && voidOpenFileFn(uri, accessor) }

	// If URI has not been specified
	return <ToolHeaderWrapper
		title={title}
		desc1={desc1}
		desc1OnClick={desc1OnClick}
	>
		<EditToolChildren
			uri={uri}
			code={toolCallSoFar.rawParams.search_replace_blocks ?? toolCallSoFar.rawParams.new_content ?? ''}
		/>
		<IconLoading />
	</ToolHeaderWrapper>



}
