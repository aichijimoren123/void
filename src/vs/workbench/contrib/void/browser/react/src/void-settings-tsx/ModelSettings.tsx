import { useEffect, useState, useRef } from "react"; // Added useRef import just in case it was missed, though likely already present
import {
	ProviderName,
	providerNames,
	VoidStatefulModelInfo,
	displayInfoOfProviderName,
} from "../../../../common/voidSettingsTypes.js";
import ErrorBoundary from "../sidebar-tsx/ErrorBoundary.js";
import { VoidButtonBgDarken } from "../util/DarkenBgButton.js";
import { useAccessor, useSettingsState } from "../util/services.js";
import { X, Asterisk, Plus } from "lucide-react";
import { ChatMarkdownRender } from "../markdown/ChatMarkdownRender.js";
import {
	getModelCapabilities,
	modelOverrideKeys,
	ModelOverrides,
} from "../../../../common/modelCapabilities.js";
import { AnimatedCheckmarkButton } from "./AnimatedCheckmarkButton.js";
import { AddButton } from "./AddButton.js";
import { VoidSimpleInputBox } from "../util/SimpleInputBox.js";
import { VoidSwitch } from "../util/Switch.js";
import { VoidCustomDropdownBox } from "../util/DropdownBox.js";

// This new dialog replaces the verbose UI with a single JSON override box.
const SimpleModelSettingsDialog = ({
	isOpen,
	onClose,
	modelInfo,
}: {
	isOpen: boolean;
	onClose: () => void;
	modelInfo: {
		modelName: string;
		providerName: ProviderName;
		type: "autodetected" | "custom" | "default";
	} | null;
}) => {
	if (!isOpen || !modelInfo) return null;

	const { modelName, providerName, type } = modelInfo;
	const accessor = useAccessor();
	const settingsState = useSettingsState();
	const mouseDownInsideModal = useRef(false); // Ref to track mousedown origin
	const settingsStateService = accessor.get("IVoidSettingsService");

	// current overrides and defaults
	const defaultModelCapabilities = getModelCapabilities(
		providerName,
		modelName,
		undefined
	);
	const currentOverrides =
		settingsState.overridesOfModel?.[providerName]?.[modelName] ?? undefined;
	const { recognizedModelName, isUnrecognizedModel } = defaultModelCapabilities;

	// Create the placeholder with the default values for allowed keys
	const partialDefaults: Partial<ModelOverrides> = {};
	for (const k of modelOverrideKeys) {
		if (defaultModelCapabilities[k])
			partialDefaults[k] = defaultModelCapabilities[k] as any;
	}
	const placeholder = JSON.stringify(partialDefaults, null, 2);

	const [overrideEnabled, setOverrideEnabled] = useState<boolean>(
		() => !!currentOverrides
	);

	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

	// reset when dialog toggles
	useEffect(() => {
		if (!isOpen) return;
		const cur = settingsState.overridesOfModel?.[providerName]?.[modelName];
		setOverrideEnabled(!!cur);
		setErrorMsg(null);
	}, [
		isOpen,
		providerName,
		modelName,
		settingsState.overridesOfModel,
		placeholder,
	]);

	const onSave = async () => {
		// if disabled override, reset overrides
		if (!overrideEnabled) {
			await settingsStateService.setOverridesOfModel(
				providerName,
				modelName,
				undefined
			);
			onClose();
			return;
		}

		// enabled overrides
		// parse json
		let parsedInput: Record<string, unknown>;

		if (textAreaRef.current?.value) {
			try {
				parsedInput = JSON.parse(textAreaRef.current.value);
			} catch (e) {
				setErrorMsg("Invalid JSON");
				return;
			}
		} else {
			setErrorMsg("Invalid JSON");
			return;
		}

		// only keep allowed keys
		const cleaned: Partial<ModelOverrides> = {};
		for (const k of modelOverrideKeys) {
			if (!(k in parsedInput)) continue;
			const isEmpty =
				parsedInput[k] === "" ||
				parsedInput[k] === null ||
				parsedInput[k] === undefined;
			if (!isEmpty) {
				cleaned[k] = parsedInput[k] as any;
			}
		}
		await settingsStateService.setOverridesOfModel(
			providerName,
			modelName,
			cleaned
		);
		onClose();
	};

	const sourcecodeOverridesLink = `https://github.com/voideditor/void/blob/2e5ecb291d33afbe4565921664fb7e183189c1c5/src/vs/workbench/contrib/void/common/modelCapabilities.ts#L146-L172`;

	return (
		<div // Backdrop
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999999]"
			onMouseDown={() => {
				mouseDownInsideModal.current = false;
			}}
			onMouseUp={() => {
				if (!mouseDownInsideModal.current) {
					onClose();
				}
				mouseDownInsideModal.current = false;
			}}
		>
			{/* MODAL */}
			<div
				className="bg-void-bg-1 rounded-md p-4 max-w-xl w-full shadow-xl overflow-y-auto max-h-[90vh]"
				onClick={(e) => e.stopPropagation()} // Keep stopping propagation for normal clicks inside
				onMouseDown={(e) => {
					mouseDownInsideModal.current = true;
					e.stopPropagation();
				}}
			>
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-medium">
						Change Defaults for {modelName} (
						{displayInfoOfProviderName(providerName).title})
					</h3>
					<button
						onClick={onClose}
						className="text-void-fg-3 hover:text-void-fg-1"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Display model recognition status */}
				<div className="text-sm text-void-fg-3 mb-4">
					{type === "default"
						? `${modelName} comes packaged with Void, so you shouldn't need to change these settings.`
						: isUnrecognizedModel
							? `Model not recognized by Void.`
							: `Void recognizes ${modelName} ("${recognizedModelName}").`}
				</div>

				{/* override toggle */}
				<div className="flex items-center gap-2 mb-4">
					<VoidSwitch
						size="xs"
						value={overrideEnabled}
						onChange={setOverrideEnabled}
					/>
					<span className="text-void-fg-3 text-sm">
						Override model defaults
					</span>
				</div>

				{/* Informational link */}
				{overrideEnabled && (
					<div className="text-sm text-void-fg-3 mb-4">
						<ChatMarkdownRender
							string={`See the [sourcecode](${sourcecodeOverridesLink}) for a reference on how to set this JSON (advanced).`}
							chatMessageLocation={undefined}
						/>
					</div>
				)}

				<textarea
					key={overrideEnabled + ""}
					ref={textAreaRef}
					className={`w-full min-h-[200px] p-2 rounded-sm border border-void-border-2 bg-void-bg-2 resize-none font-mono text-sm ${!overrideEnabled ? "text-void-fg-3" : ""
						}`}
					defaultValue={
						overrideEnabled && currentOverrides
							? JSON.stringify(currentOverrides, null, 2)
							: placeholder
					}
					placeholder={placeholder}
					readOnly={!overrideEnabled}
				/>
				{errorMsg && (
					<div className="text-red-500 mt-2 text-sm">{errorMsg}</div>
				)}

				<div className="flex justify-end gap-2 mt-4">
					<VoidButtonBgDarken onClick={onClose} className="px-3 py-1">
						Cancel
					</VoidButtonBgDarken>
					<VoidButtonBgDarken
						onClick={onSave}
						className="px-3 py-1 bg-[#0e70c0] text-white"
					>
						Save
					</VoidButtonBgDarken>
				</div>
			</div>
		</div>
	);
};

export const ModelDump = ({
	filteredProviders,
}: {
	filteredProviders?: ProviderName[];
}) => {
	const accessor = useAccessor();
	const settingsStateService = accessor.get("IVoidSettingsService");
	const settingsState = useSettingsState();

	// State to track which model's settings dialog is open
	const [openSettingsModel, setOpenSettingsModel] = useState<{
		modelName: string;
		providerName: ProviderName;
		type: "autodetected" | "custom" | "default";
	} | null>(null);

	// States for add model functionality
	const [isAddModelOpen, setIsAddModelOpen] = useState(false);
	const [showCheckmark, setShowCheckmark] = useState(false);
	const [userChosenProviderName, setUserChosenProviderName] =
		useState<ProviderName | null>(null);
	const [modelName, setModelName] = useState<string>("");
	const [errorString, setErrorString] = useState("");

	// a dump of all the enabled providers' models
	const modelDump: (VoidStatefulModelInfo & {
		providerName: ProviderName;
		providerEnabled: boolean;
	})[] = [];

	// Use either filtered providers or all providers
	const providersToShow = filteredProviders || providerNames;

	for (let providerName of providersToShow) {
		const providerSettings = settingsState.settingsOfProvider[providerName];
		// if (!providerSettings.enabled) continue
		modelDump.push(
			...providerSettings.models.map((model) => ({
				...model,
				providerName,
				providerEnabled: !!providerSettings._didFillInProviderSettings,
			}))
		);
	}

	// sort by hidden
	modelDump.sort((a, b) => {
		return Number(b.providerEnabled) - Number(a.providerEnabled);
	});

	// Add model handler
	const handleAddModel = () => {
		if (!userChosenProviderName) {
			setErrorString("Please select a provider.");
			return;
		}
		if (!modelName) {
			setErrorString("Please enter a model name.");
			return;
		}

		// Check if model already exists
		if (
			settingsState.settingsOfProvider[userChosenProviderName].models.find(
				(m) => m.modelName === modelName
			)
		) {
			setErrorString(`This model already exists.`);
			return;
		}

		settingsStateService.addModel(userChosenProviderName, modelName);
		setShowCheckmark(true);
		setTimeout(() => {
			setShowCheckmark(false);
			setIsAddModelOpen(false);
			setUserChosenProviderName(null);
			setModelName("");
		}, 1500);
		setErrorString("");
	};

	return (
		<div className="">
			{modelDump.map((m, i) => {
				const { isHidden, type, modelName, providerName, providerEnabled } = m;

				const isNewProviderName =
					(i > 0 ? modelDump[i - 1] : undefined)?.providerName !== providerName;

				const providerTitle = displayInfoOfProviderName(providerName).title;

				const disabled = !providerEnabled;
				const value = disabled ? false : !isHidden;

				const tooltipName = disabled
					? `Add ${providerTitle} to enable`
					: value === true
						? "Show in Dropdown"
						: "Hide from Dropdown";

				const detailAboutModel =
					type === "autodetected" ? (
						<Asterisk
							size={14}
							className="inline-block align-text-top brightness-115 stroke-[2] text-[#0e70c0]"
							data-tooltip-id="void-tooltip"
							data-tooltip-place="right"
							data-tooltip-content="Detected locally"
						/>
					) : type === "custom" ? (
						<Asterisk
							size={14}
							className="inline-block align-text-top brightness-115 stroke-[2] text-[#0e70c0]"
							data-tooltip-id="void-tooltip"
							data-tooltip-place="right"
							data-tooltip-content="Custom model"
						/>
					) : undefined;

				const hasOverrides =
					!!settingsState.overridesOfModel?.[providerName]?.[modelName];

				return (
					<div
						key={`${modelName}${providerName}`}
						className={`flex items-center justify-between gap-4 hover:bg-black/10 dark:hover:bg-gray-300/10 py-1 px-3 rounded-sm overflow-hidden cursor-default truncate group
				`}
					>
						{/* left part is width:full */}
						<div className={`flex flex-grow items-center gap-4`}>
							<span className="w-full max-w-32">
								{isNewProviderName ? providerTitle : ""}
							</span>
							<span className="w-fit max-w-[400px] truncate">{modelName}</span>
						</div>

						{/* right part is anything that fits */}
						<div className="flex items-center gap-2 w-fit">
							{/* Advanced Settings button (gear). Hide entirely when provider/model disabled. */}
							{disabled ? null : (
								<div className="w-5 flex items-center justify-center">
									<button
										onClick={() => {
											setOpenSettingsModel({ modelName, providerName, type });
										}}
										data-tooltip-id="void-tooltip"
										data-tooltip-place="right"
										data-tooltip-content="Advanced Settings"
										className={`${hasOverrides ? "" : "opacity-0 group-hover:opacity-100"
											} transition-opacity`}
									>
										<Plus size={12} className="text-void-fg-3 opacity-50" />
									</button>
								</div>
							)}

							{/* Blue star */}
							{detailAboutModel}

							{/* Switch */}
							<VoidSwitch
								value={value}
								onChange={() => {
									settingsStateService.toggleModelHidden(
										providerName,
										modelName
									);
								}}
								disabled={disabled}
								size="sm"
								data-tooltip-id="void-tooltip"
								data-tooltip-place="right"
								data-tooltip-content={tooltipName}
							/>

							{/* X button */}
							<div className={`w-5 flex items-center justify-center`}>
								{type === "default" || type === "autodetected" ? null : (
									<button
										onClick={() => {
											settingsStateService.deleteModel(providerName, modelName);
										}}
										data-tooltip-id="void-tooltip"
										data-tooltip-place="right"
										data-tooltip-content="Delete"
										className={`${hasOverrides ? "" : "opacity-0 group-hover:opacity-100"
											} transition-opacity`}
									>
										<X size={12} className="text-void-fg-3 opacity-50" />
									</button>
								)}
							</div>
						</div>
					</div>
				);
			})}

			{/* Add Model Section */}
			{showCheckmark ? (
				<div className="mt-4">
					<AnimatedCheckmarkButton
						text="Added"
						className="bg-[#0e70c0] text-white px-3 py-1 rounded-sm"
					/>
				</div>
			) : isAddModelOpen ? (
				<div className="mt-4">
					<form className="flex items-center gap-2">
						{/* Provider dropdown */}
						<ErrorBoundary>
							<VoidCustomDropdownBox
								options={providersToShow}
								selectedOption={userChosenProviderName}
								onChangeOption={(pn) => setUserChosenProviderName(pn)}
								getOptionDisplayName={(pn) =>
									pn ? displayInfoOfProviderName(pn).title : "Provider Name"
								}
								getOptionDropdownName={(pn) =>
									pn ? displayInfoOfProviderName(pn).title : "Provider Name"
								}
								getOptionsEqual={(a, b) => a === b}
								className="max-w-32 mx-2 w-full resize-none bg-void-bg-1 text-void-fg-1 placeholder:text-void-fg-3 border border-void-border-2 focus:border-void-border-1 py-1 px-2 rounded"
								arrowTouchesText={false}
							/>
						</ErrorBoundary>

						{/* Model name input */}
						<ErrorBoundary>
							<VoidSimpleInputBox
								value={modelName}
								compact={true}
								onChangeValue={setModelName}
								placeholder="Model Name"
								className="max-w-32"
							/>
						</ErrorBoundary>

						{/* Add button */}
						<ErrorBoundary>
							<AddButton
								type="button"
								disabled={!modelName || !userChosenProviderName}
								onClick={handleAddModel}
							/>
						</ErrorBoundary>

						{/* X button to cancel */}
						<button
							type="button"
							onClick={() => {
								setIsAddModelOpen(false);
								setErrorString("");
								setModelName("");
								setUserChosenProviderName(null);
							}}
							className="text-void-fg-4"
						>
							<X className="size-4" />
						</button>
					</form>

					{errorString && (
						<div className="text-red-500 truncate whitespace-nowrap mt-1">
							{errorString}
						</div>
					)}
				</div>
			) : (
				<div
					className="text-void-fg-4 flex flex-nowrap text-nowrap items-center hover:brightness-110 cursor-pointer mt-4"
					onClick={() => setIsAddModelOpen(true)}
				>
					<div className="flex items-center gap-1">
						<Plus size={16} />
						<span>Add a model</span>
					</div>
				</div>
			)}

			{/* Model Settings Dialog */}
			<SimpleModelSettingsDialog
				isOpen={openSettingsModel !== null}
				onClose={() => setOpenSettingsModel(null)}
				modelInfo={openSettingsModel}
			/>
		</div>
	);
};
