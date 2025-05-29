import { File, Folder, Text } from 'lucide-react';
import { useEffect, useState } from 'react';
import { URI } from '../../../../../../../base/common/uri.js';
import { StagingSelectionItem } from '../../../../common/chatThreadServiceTypes.js';
import { useAccessor, useActiveURI } from '../util/services.js';
import { IconX } from './Icons.js';
import { getBasename, voidOpenFileFn } from './utils.js';

export const SelectedFiles = (
	{ type, selections, setSelections, showProspectiveSelections, messageIdx, }:
		| { type: 'past', selections: StagingSelectionItem[]; setSelections?: undefined, showProspectiveSelections?: undefined, messageIdx: number, }
		| { type: 'staging', selections: StagingSelectionItem[]; setSelections: ((newSelections: StagingSelectionItem[]) => void), showProspectiveSelections?: boolean, messageIdx?: number }
) => {

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const modelReferenceService = accessor.get('IVoidModelService')




	// state for tracking prospective files
	const { uri: currentURI } = useActiveURI()
	const [recentUris, setRecentUris] = useState<URI[]>([])
	const maxRecentUris = 10
	const maxProspectiveFiles = 3
	useEffect(() => { // handle recent files
		if (!currentURI) return
		setRecentUris(prev => {
			const withoutCurrent = prev.filter(uri => uri.fsPath !== currentURI.fsPath) // remove duplicates
			const withCurrent = [currentURI, ...withoutCurrent]
			return withCurrent.slice(0, maxRecentUris)
		})
	}, [currentURI])
	const [prospectiveSelections, setProspectiveSelections] = useState<StagingSelectionItem[]>([])


	// handle prospective files
	useEffect(() => {
		const computeRecents = async () => {
			const prospectiveURIs = recentUris
				.filter(uri => !selections.find(s => s.type === 'File' && s.uri.fsPath === uri.fsPath))
				.slice(0, maxProspectiveFiles)

			const answer: StagingSelectionItem[] = []
			for (const uri of prospectiveURIs) {
				answer.push({
					type: 'File',
					uri: uri,
					language: (await modelReferenceService.getModelSafe(uri)).model?.getLanguageId() || 'plaintext',
					state: { wasAddedAsCurrentFile: false },
				})
			}
			return answer
		}

		// add a prospective file if type === 'staging' and if the user is in a file, and if the file is not selected yet
		if (type === 'staging' && showProspectiveSelections) {
			computeRecents().then((a) => setProspectiveSelections(a))
		}
		else {
			setProspectiveSelections([])
		}
	}, [recentUris, selections, type, showProspectiveSelections])


	const allSelections = [...selections, ...prospectiveSelections]

	if (allSelections.length === 0) {
		return null
	}

	return (
		<div className='flex items-center flex-wrap text-left relative gap-x-0.5 gap-y-1 pb-0.5'>

			{allSelections.map((selection, i) => {

				const isThisSelectionProspective = i > selections.length - 1

				const thisKey = selection.type === 'CodeSelection' ? selection.type + selection.language + selection.range + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
					: selection.type === 'File' ? selection.type + selection.language + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
						: selection.type === 'Folder' ? selection.type + selection.language + selection.state + selection.uri.fsPath
							: i

				const SelectionIcon = (
					selection.type === 'File' ? File
						: selection.type === 'Folder' ? Folder
							: selection.type === 'CodeSelection' ? Text
								: (undefined as never)
				)

				return <div // container for summarybox and code
					key={thisKey}
					className={`flex flex-col space-y-[1px]`}
				>
					{/* summarybox */}
					<div
						className={`
							flex items-center gap-1 relative
							px-1
							w-fit h-fit
							select-none
							text-xs text-nowrap
							border rounded-sm
							${isThisSelectionProspective ? 'bg-void-bg-1 text-void-fg-3 opacity-80' : 'bg-void-bg-1 hover:brightness-95 text-void-fg-1'}
							${isThisSelectionProspective
								? 'border-void-border-2'
								: 'border-void-border-1'
							}
							hover:border-void-border-1
							transition-all duration-150
						`}
						onClick={() => {
							if (type !== 'staging') return; // (never)
							if (isThisSelectionProspective) { // add prospective selection to selections
								setSelections([...selections, selection])
							}
							else if (selection.type === 'File') { // open files
								voidOpenFileFn(selection.uri, accessor);

								const wasAddedAsCurrentFile = selection.state.wasAddedAsCurrentFile
								if (wasAddedAsCurrentFile) {
									// make it so the file is added permanently, not just as the current file
									const newSelection: StagingSelectionItem = { ...selection, state: { ...selection.state, wasAddedAsCurrentFile: false } }
									setSelections([
										...selections.slice(0, i),
										newSelection,
										...selections.slice(i + 1)
									])
								}
							}
							else if (selection.type === 'CodeSelection') {
								voidOpenFileFn(selection.uri, accessor, selection.range);
							}
							else if (selection.type === 'Folder') {
								// TODO!!! reveal in tree
							}
						}}
					>
						{<SelectionIcon size={10} />}

						{ // file name and range
							getBasename(selection.uri.fsPath)
							+ (selection.type === 'CodeSelection' ? ` (${selection.range[0]}-${selection.range[1]})` : '')
						}

						{selection.type === 'File' && selection.state.wasAddedAsCurrentFile && messageIdx === undefined && currentURI?.fsPath === selection.uri.fsPath ?
							<span className={`text-[8px] 'void-opacity-60 text-void-fg-4`}>
								{`(Current File)`}
							</span>
							: null
						}

						{type === 'staging' && !isThisSelectionProspective ? // X button
							<div // box for making it easier to click
								className='cursor-pointer z-1 self-stretch flex items-center justify-center'
								onClick={(e) => {
									e.stopPropagation(); // don't open/close selection
									if (type !== 'staging') return;
									setSelections([...selections.slice(0, i), ...selections.slice(i + 1)])
								}}
							>
								<IconX
									className='stroke-[2]'
									size={10}
								/>
							</div>
							: <></>
						}
					</div>
				</div>

			})}


		</div>

	)
}
