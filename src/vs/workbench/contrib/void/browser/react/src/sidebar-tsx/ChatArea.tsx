import React, { ButtonHTMLAttributes, useCallback, useMemo } from "react";
import { useAccessor, useSettingsState } from "../util/services.js";
import {
	ChatMode,
	FeatureName,
} from "../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js";
import { StagingSelectionItem } from "../../../../common/chatThreadServiceTypes.js";
import {
	getIsReasoningEnabledState,
	getModelCapabilities,
} from "../../../../common/modelCapabilities.js";
import { VoidCustomDropdownBox } from "../util/DropdownBox.js";
import { ModelDropdown } from "../void-settings-tsx/ModelDropdown.js";
import { IconArrowUp, IconSquare, IconX } from "./Icons.js";
import { SelectedFiles } from "./SelectedFiles.js";
import { VoidSlider } from "../util/Slider.js";
import { VoidSwitch } from "../util/Switch.js";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
const DEFAULT_BUTTON_SIZE = 22;

export const ButtonSubmit = ({
	className,
	disabled,
	...props
}: ButtonProps & Required<Pick<ButtonProps, "disabled">>) => {
	return (
		<button
			type="button"
			className={`rounded-full flex-shrink-0 flex-grow-0 flex items-center justify-center
			${disabled ? "bg-vscode-disabled-fg cursor-default" : "bg-white cursor-pointer"}
			${className}
		`}
			// data-tooltip-id='void-tooltip'
			// data-tooltip-content={'Send'}
			// data-tooltip-place='left'
			{...props}
		>
			<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="stroke-[2] p-[2px]" />
		</button>
	);
};

export const ButtonStop = ({
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			className={`rounded-full flex-shrink-0 flex-grow-0 cursor-pointer flex items-center justify-center
			bg-white
			${className}
		`}
			type="button"
			{...props}
		>
			<IconSquare size={DEFAULT_BUTTON_SIZE} className="stroke-[3] p-[7px]" />
		</button>
	);
};

// SLIDER ONLY:
const ReasoningOptionSlider = ({
	featureName,
}: {
	featureName: FeatureName;
}) => {
	const accessor = useAccessor();

	const voidSettingsService = accessor.get("IVoidSettingsService");
	const voidSettingsState = useSettingsState();

	const modelSelection = voidSettingsState.modelSelectionOfFeature[featureName];
	const overridesOfModel = voidSettingsState.overridesOfModel;

	if (!modelSelection) return null;

	const { modelName, providerName } = modelSelection;
	const { reasoningCapabilities } = getModelCapabilities(
		providerName,
		modelName,
		overridesOfModel
	);
	const { canTurnOffReasoning, reasoningSlider: reasoningBudgetSlider } =
		reasoningCapabilities || {};

	const modelSelectionOptions =
		voidSettingsState.optionsOfModelSelection[featureName][providerName]?.[
		modelName
		];
	const isReasoningEnabled = getIsReasoningEnabledState(
		featureName,
		providerName,
		modelName,
		modelSelectionOptions,
		overridesOfModel
	);

	if (canTurnOffReasoning && !reasoningBudgetSlider) {
		// if it's just a on/off toggle without a power slider
		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSwitch
					size="xxs"
					value={isReasoningEnabled}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && !newVal;
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{ reasoningEnabled: !isOff }
						);
					}}
				/>
			</div>
		);
	}

	if (reasoningBudgetSlider?.type === "budget_slider") {
		// if it's a slider
		const { min: min_, max, default: defaultVal } = reasoningBudgetSlider;

		const nSteps = 8; // only used in calculating stepSize, stepSize is what actually matters
		const stepSize = Math.round((max - min_) / nSteps);

		const valueIfOff = min_ - stepSize;
		const min = canTurnOffReasoning ? valueIfOff : min_;
		const value = isReasoningEnabled
			? voidSettingsState.optionsOfModelSelection[featureName][
				modelSelection.providerName
			]?.[modelSelection.modelName]?.reasoningBudget ?? defaultVal
			: valueIfOff;

		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSlider
					width={50}
					size="xs"
					min={min}
					max={max}
					step={stepSize}
					value={value}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && newVal === valueIfOff;
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{ reasoningEnabled: !isOff, reasoningBudget: newVal }
						);
					}}
				/>
				<span className="text-void-fg-3 text-xs pointer-events-none">
					{isReasoningEnabled ? `${value} tokens` : "Thinking disabled"}
				</span>
			</div>
		);
	}

	if (reasoningBudgetSlider?.type === "effort_slider") {
		const { values, default: defaultVal } = reasoningBudgetSlider;

		const min = canTurnOffReasoning ? -1 : 0;
		const max = values.length - 1;

		const currentEffort =
			voidSettingsState.optionsOfModelSelection[featureName][
				modelSelection.providerName
			]?.[modelSelection.modelName]?.reasoningEffort ?? defaultVal;
		const valueIfOff = -1;
		const value =
			isReasoningEnabled && currentEffort
				? values.indexOf(currentEffort)
				: valueIfOff;

		const currentEffortCapitalized =
			currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1, Infinity);

		return (
			<div className="flex items-center gap-x-2">
				<span className="text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1">
					Thinking
				</span>
				<VoidSlider
					width={30}
					size="xs"
					min={min}
					max={max}
					step={1}
					value={value}
					onChange={(newVal) => {
						const isOff = canTurnOffReasoning && newVal === valueIfOff;
						voidSettingsService.setOptionsOfModelSelection(
							featureName,
							modelSelection.providerName,
							modelSelection.modelName,
							{
								reasoningEnabled: !isOff,
								reasoningEffort: values[newVal] ?? undefined,
							}
						);
					}}
				/>
				<span className="text-void-fg-3 text-xs pointer-events-none">
					{isReasoningEnabled
						? `${currentEffortCapitalized}`
						: "Thinking disabled"}
				</span>
			</div>
		);
	}

	return null;
};

const nameOfChatMode = {
	normal: "Chat",
	gather: "Gather",
	agent: "Agent",
};

const ChatModeDropdown = ({ className }: { className: string }) => {
	const accessor = useAccessor();

	const voidSettingsService = accessor.get("IVoidSettingsService");
	const settingsState = useSettingsState();

	const options: ChatMode[] = useMemo(() => ["normal", "gather", "agent"], []);

	const onChangeOption = useCallback(
		(newVal: ChatMode) => {
			voidSettingsService.setGlobalSetting("chatMode", newVal);
		},
		[voidSettingsService]
	);

	return (
		<VoidCustomDropdownBox
			className={className}
			options={options}
			selectedOption={settingsState.globalSettings.chatMode}
			onChangeOption={onChangeOption}
			getOptionDisplayName={(val) => nameOfChatMode[val]}
			getOptionDropdownName={(val) => nameOfChatMode[val]}
			getOptionsEqual={(a, b) => a === b}
		/>
	);
};

interface ChatAreaProps {
	// Required
	children: React.ReactNode; // This will be the input component

	// Form controls
	onSubmit: () => void;
	onAbort: () => void;
	isStreaming: boolean;
	isDisabled?: boolean;
	divRef?: React.RefObject<HTMLDivElement | null>;

	// UI customization
	className?: string;
	showModelDropdown?: boolean;
	showSelections?: boolean;
	showProspectiveSelections?: boolean;
	loadingIcon?: React.ReactNode;

	selections?: StagingSelectionItem[];
	setSelections?: (s: StagingSelectionItem[]) => void;
	// selections?: any[];
	// onSelectionsChange?: (selections: any[]) => void;

	onClickAnywhere?: () => void;
	// Optional close button
	onClose?: () => void;

	featureName: FeatureName;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
	children,
	onSubmit,
	onAbort,
	onClose,
	onClickAnywhere,
	divRef,
	isStreaming = false,
	isDisabled = false,
	className = "",
	showModelDropdown = true,
	showSelections = false,
	showProspectiveSelections = false,
	selections,
	setSelections,
	featureName,
	loadingIcon,
}) => {
	return (
		<div
			ref={divRef}
			className={`
				gap-x-1
				flex flex-col p-2 relative input text-left shrink-0
				rounded-md
				bg-void-bg-1
				transition-all duration-200
				border border-void-border-3 focus-within:border-void-border-1 hover:border-void-border-1
				max-h-[80vh] overflow-y-auto
				${className}
			`}
			onClick={(e) => {
				onClickAnywhere?.();
			}}
		>
			{/* Selections section */}
			{showSelections && selections && setSelections && (
				<SelectedFiles
					type="staging"
					selections={selections}
					setSelections={setSelections}
					showProspectiveSelections={showProspectiveSelections}
				/>
			)}

			{/* Input section */}
			<div className="relative w-full">
				{children}

				{/* Close button (X) if onClose is provided */}
				{onClose && (
					<div className="absolute -top-1 -right-1 cursor-pointer z-1">
						<IconX
							size={12}
							className="stroke-[2] opacity-80 text-void-fg-3 hover:brightness-95"
							onClick={onClose}
						/>
					</div>
				)}
			</div>

			{/* Bottom row */}
			<div className="flex flex-row justify-between items-end gap-1">
				{showModelDropdown && (
					<div className="flex flex-col gap-y-1">
						<ReasoningOptionSlider featureName={featureName} />

						<div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-nowrap ">
							{featureName === "Chat" && (
								<ChatModeDropdown className="text-xs text-void-fg-3 bg-[#393a3b] rounded-full py-0.5 px-2" />
							)}
							<ModelDropdown
								featureName={featureName}
								className="text-xs text-void-fg-3 bg-void-bg-1 rounded"
							/>
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">
					{isStreaming && loadingIcon}

					{isStreaming ? (
						<ButtonStop onClick={onAbort} />
					) : (
						<ButtonSubmit onClick={onSubmit} disabled={isDisabled} />
					)}
				</div>
			</div>
		</div>
	);
};
