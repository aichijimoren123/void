import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useAccessor } from "../util/services.js";
import { Pencil, X } from "lucide-react";
import {
	ChatMessage,
	StagingSelectionItem,
} from "../../../../common/chatThreadServiceTypes.js";
import { TextAreaFns, VoidInputBox2 } from "../util/InputBox.js";
import { ChatArea } from "./ChatArea.js";
import { SelectedFiles } from "./SelectedFiles.js";

type ChatBubbleMode = "display" | "edit";
export const UserMessageComponent = ({
	chatMessage,
	messageIdx,
	isCheckpointGhost,
	currCheckpointIdx,
	_scrollToBottom,
}: {
	chatMessage: ChatMessage & { role: "user" };
	messageIdx: number;
	currCheckpointIdx: number | undefined;
	isCheckpointGhost: boolean;
	_scrollToBottom: (() => void) | null;
}) => {
	const accessor = useAccessor();
	const chatThreadsService = accessor.get("IChatThreadService");

	// global state
	let isBeingEdited = false;
	let stagingSelections: StagingSelectionItem[] = [];
	let setIsBeingEdited = (_: boolean) => { };
	let setStagingSelections = (_: StagingSelectionItem[]) => { };

	if (messageIdx !== undefined) {
		const _state = chatThreadsService.getCurrentMessageState(messageIdx);
		isBeingEdited = _state.isBeingEdited;
		stagingSelections = _state.stagingSelections;
		setIsBeingEdited = (v) =>
			chatThreadsService.setCurrentMessageState(messageIdx, {
				isBeingEdited: v,
			});
		setStagingSelections = (s) =>
			chatThreadsService.setCurrentMessageState(messageIdx, {
				stagingSelections: s,
			});
	}

	// local state
	const mode: ChatBubbleMode = isBeingEdited ? "edit" : "display";
	const [isFocused, setIsFocused] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isDisabled, setIsDisabled] = useState(false);
	const [textAreaRefState, setTextAreaRef] =
		useState<HTMLTextAreaElement | null>(null);
	const textAreaFnsRef = useRef<TextAreaFns | null>(null);
	// initialize on first render, and when edit was just enabled
	const _mustInitialize = useRef(true);
	const _justEnabledEdit = useRef(false);
	useEffect(() => {
		const canInitialize = mode === "edit" && textAreaRefState;
		const shouldInitialize =
			_justEnabledEdit.current || _mustInitialize.current;
		if (canInitialize && shouldInitialize) {
			setStagingSelections(
				(chatMessage.selections || []).map((s) => {
					// quick hack so we dont have to do anything more
					if (s.type === "File")
						return {
							...s,
							state: { ...s.state, wasAddedAsCurrentFile: false },
						};
					else return s;
				})
			);

			if (textAreaFnsRef.current)
				textAreaFnsRef.current.setValue(chatMessage.displayContent || "");

			textAreaRefState.focus();

			_justEnabledEdit.current = false;
			_mustInitialize.current = false;
		}
	}, [
		chatMessage,
		mode,
		_justEnabledEdit,
		textAreaRefState,
		textAreaFnsRef.current,
		_justEnabledEdit.current,
		_mustInitialize.current,
	]);

	const onOpenEdit = () => {
		setIsBeingEdited(true);
		chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
		_justEnabledEdit.current = true;
	};
	const onCloseEdit = () => {
		setIsFocused(false);
		setIsHovered(false);
		setIsBeingEdited(false);
		chatThreadsService.setCurrentlyFocusedMessageIdx(undefined);
	};

	const EditSymbol = mode === "display" ? Pencil : X;

	let chatbubbleContents: React.ReactNode;
	if (mode === "display") {
		chatbubbleContents = (
			<>
				<SelectedFiles
					type="past"
					messageIdx={messageIdx}
					selections={chatMessage.selections || []}
				/>
				<span className="px-0.5">{chatMessage.displayContent}</span>
			</>
		);
	} else if (mode === "edit") {
		const onSubmit = async () => {
			if (isDisabled) return;
			if (!textAreaRefState) return;
			if (messageIdx === undefined) return;

			// cancel any streams on this thread
			const threadId = chatThreadsService.state.currentThreadId;

			await chatThreadsService.abortRunning(threadId);

			// update state
			setIsBeingEdited(false);
			chatThreadsService.setCurrentlyFocusedMessageIdx(undefined);

			// stream the edit
			const userMessage = textAreaRefState.value;
			try {
				await chatThreadsService.editUserMessageAndStreamResponse({
					userMessage,
					messageIdx,
					threadId,
				});
			} catch (e) {
				console.error("Error while editing message:", e);
			}
			await chatThreadsService.focusCurrentChat();
			requestAnimationFrame(() => _scrollToBottom?.());
		};

		const onAbort = async () => {
			const threadId = chatThreadsService.state.currentThreadId;
			await chatThreadsService.abortRunning(threadId);
		};

		const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Escape") {
				onCloseEdit();
			}
			if (e.key === "Enter" && !e.shiftKey) {
				onSubmit();
			}
		};

		if (!chatMessage.content) {
			// don't show if empty and not loading (if loading, want to show).
			return null;
		}

		chatbubbleContents = (
			<ChatArea
				featureName="Chat"
				onSubmit={onSubmit}
				onAbort={onAbort}
				isStreaming={false}
				isDisabled={isDisabled}
				showSelections={true}
				showProspectiveSelections={false}
				selections={stagingSelections}
				setSelections={setStagingSelections}
			>
				<VoidInputBox2
					enableAtToMention
					ref={setTextAreaRef}
					className="min-h-[81px] max-h-[500px] px-0.5"
					placeholder="Edit your message..."
					onChangeText={(text) => setIsDisabled(!text)}
					onFocus={() => {
						setIsFocused(true);
						chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
					}}
					onBlur={() => {
						setIsFocused(false);
					}}
					onKeyDown={onKeyDown}
					fnsRef={textAreaFnsRef}
					multiline={true}
				/>
			</ChatArea>
		);
	}

	const isMsgAfterCheckpoint =
		currCheckpointIdx !== undefined && currCheckpointIdx === messageIdx - 1;

	return (
		<div
			// align chatbubble accoridng to role
			className={`
		relative ml-auto
		${mode === "edit"
					? "w-full max-w-full"
					: mode === "display"
						? `self-end w-fit max-w-full whitespace-pre-wrap`
						: "" // user words should be pre
				}

		${isCheckpointGhost && !isMsgAfterCheckpoint
					? "opacity-50 pointer-events-none"
					: ""
				}
	`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div
				// style chatbubble according to role
				className={`
			text-left rounded-lg max-w-full
			${mode === "edit"
						? ""
						: mode === "display"
							? "p-2 flex flex-col bg-void-bg-1 text-void-fg-1 overflow-x-auto cursor-pointer"
							: ""
					}
		`}
				onClick={() => {
					if (mode === "display") {
						onOpenEdit();
					}
				}}
			>
				{chatbubbleContents}
			</div>

			<div
				className="absolute -top-1 -right-1 translate-x-0 -translate-y-0 z-1"
			// data-tooltip-id='void-tooltip'
			// data-tooltip-content='Edit message'
			// data-tooltip-place='left'
			>
				<EditSymbol
					size={18}
					className={`
					cursor-pointer
					p-[2px]
					bg-void-bg-1 border border-void-border-1 rounded-md
					transition-opacity duration-200 ease-in-out
					${isHovered || (isFocused && mode === "edit") ? "opacity-100" : "opacity-0"}
				`}
					onClick={() => {
						if (mode === "display") {
							onOpenEdit();
						} else if (mode === "edit") {
							onCloseEdit();
						}
					}}
				/>
			</div>
		</div>
	);
};
