import React, { useCallback, useMemo, useState, useRef } from "react"; // Added useRef import just in case it was missed, though likely already present
import {
	RefreshableProviderName,
	refreshableProviderNames,
	displayInfoOfProviderName,
	nonlocalProviderNames,
	localProviderNames,
	GlobalSettingName,

	displayInfoOfFeatureName,

} from "../../../../common/voidSettingsTypes.js";
import ErrorBoundary from "../sidebar-tsx/ErrorBoundary.js";
import { VoidButtonBgDarken } from "../util/DarkenBgButton.js";
import {
	useAccessor,
	useIsDark,
	useIsOptedOut,
	useRefreshModelListener,
	useRefreshModelState,
	useSettingsState,
} from "../util/services.js";
import { X, RefreshCw, Loader2, Check } from "lucide-react";
import { ModelDropdown } from "./ModelDropdown.js";
import { ChatMarkdownRender } from "../markdown/ChatMarkdownRender.js";
import {
	ToolApprovalType,
	toolApprovalTypes,
} from "../../../../common/toolsServiceTypes.js";
import Severity from "../../../../../../../base/common/severity.js";
import { OPT_OUT_KEY } from "../../../../common/storageKeys.js";
import {
	StorageScope,
	StorageTarget,
} from "../../../../../../../platform/storage/common/storage.js";
import { TarsProviderSettings } from "./ProviderSettings.js";
import { OneClickSwitchButton } from "./ClickSwitchButton.js";
import { ModelDump } from "./ModelSettings.js";
import { ConfirmButton } from "./ConfirmButton.js";
import { MCPServersList } from "./MCPSettings.js";
import { OllamaSetupInstructions } from "./OllamaInstructions.js";
import { VoidInputBox2 } from "../util/InputBox.js";
import { VoidSwitch } from "../util/Switch.js";
import { VoidCustomDropdownBox } from "../util/DropdownBox.js";

type Tab =
	| "models"
	| "localProviders"
	| "providers"
	| "featureOptions"
	| "mcp"
	| "general"
	| "all";

const ButtonLeftTextRightOption = ({
	text,
	leftButton,
}: {
	text: string;
	leftButton?: React.ReactNode;
}) => {
	return (
		<div className="flex items-center text-void-fg-3 px-3 py-0.5 rounded-sm overflow-hidden gap-2">
			{leftButton ? leftButton : null}
			<span>{text}</span>
		</div>
	);
};

// models
const RefreshModelButton = ({
	providerName,
}: {
	providerName: RefreshableProviderName;
}) => {
	const refreshModelState = useRefreshModelState();

	const accessor = useAccessor();
	const refreshModelService = accessor.get("IRefreshModelService");
	const metricsService = accessor.get("IMetricsService");

	const [justFinished, setJustFinished] = useState<null | "finished" | "error">(
		null
	);

	useRefreshModelListener(
		useCallback(
			(providerName2, refreshModelState) => {
				if (providerName2 !== providerName) return;
				const { state } = refreshModelState[providerName];
				if (!(state === "finished" || state === "error")) return;
				// now we know we just entered 'finished' state for this providerName
				setJustFinished(state);
				const tid = setTimeout(() => {
					setJustFinished(null);
				}, 2000);
				return () => clearTimeout(tid);
			},
			[providerName]
		)
	);

	const { state } = refreshModelState[providerName];

	const { title: providerTitle } = displayInfoOfProviderName(providerName);

	return (
		<ButtonLeftTextRightOption
			leftButton={
				<button
					className="flex items-center"
					disabled={state === "refreshing" || justFinished !== null}
					onClick={() => {
						refreshModelService.startRefreshingModels(providerName, {
							enableProviderOnSuccess: false,
							doNotFire: false,
						});
						metricsService.capture("Click", {
							providerName,
							action: "Refresh Models",
						});
					}}
				>
					{justFinished === "finished" ? (
						<Check className="stroke-green-500 size-3" />
					) : justFinished === "error" ? (
						<X className="stroke-red-500 size-3" />
					) : state === "refreshing" ? (
						<Loader2 className="size-3 animate-spin" />
					) : (
						<RefreshCw className="size-3" />
					)}
				</button>
			}
			text={
				justFinished === "finished"
					? `${providerTitle} Models are up-to-date!`
					: justFinished === "error"
						? `${providerTitle} not found!`
						: `Manually refresh ${providerTitle} models.`
			}
		/>
	);
};

const RefreshableModels = () => {
	const settingsState = useSettingsState();

	const buttons = refreshableProviderNames.map((providerName) => {
		if (
			!settingsState.settingsOfProvider[providerName]._didFillInProviderSettings
		)
			return null;
		return (
			<RefreshModelButton key={providerName} providerName={providerName} />
		);
	});

	return <>{buttons}</>;
};

type TabName = "models" | "general";
export const AutoDetectLocalModelsToggle = () => {
	const settingName: GlobalSettingName = "autoRefreshModels";

	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	const metricsService = accessor.get("IMetricsService");

	const voidSettingsState = useSettingsState();

	// right now this is just `enabled_autoRefreshModels`
	const enabled = voidSettingsState.globalSettings[settingName];

	return (
		<ButtonLeftTextRightOption
			leftButton={
				<VoidSwitch
					size="xxs"
					value={enabled}
					onChange={(newVal) => {
						voidSettingsService.setGlobalSetting(settingName, newVal);
						metricsService.capture("Click", {
							action: "Autorefresh Toggle",
							settingName,
							enabled: newVal,
						});
					}}
				/>
			}
			text={`Automatically detect local providers and models (${refreshableProviderNames
				.map((providerName) => displayInfoOfProviderName(providerName).title)
				.join(", ")}).`}
		/>
	);
};

export const AIInstructionsBox = () => {
	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	const voidSettingsState = useSettingsState();
	return (
		<VoidInputBox2
			className="min-h-[81px] p-3 rounded-sm"
			initValue={voidSettingsState.globalSettings.aiInstructions}
			placeholder={`Do not change my indentation or delete my comments. When writing TS or JS, do not add ;'s. Write new code using Rust if possible. `}
			multiline
			onChangeText={(newText) => {
				voidSettingsService.setGlobalSetting("aiInstructions", newText);
			}}
		/>
	);
};

const FastApplyMethodDropdown = () => {
	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");

	const options = useMemo(() => [true, false], []);

	const onChangeOption = useCallback(
		(newVal: boolean) => {
			voidSettingsService.setGlobalSetting("enableFastApply", newVal);
		},
		[voidSettingsService]
	);

	return (
		<VoidCustomDropdownBox
			className="text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-1 rounded p-0.5 px-1"
			options={options}
			selectedOption={voidSettingsService.state.globalSettings.enableFastApply}
			onChangeOption={onChangeOption}
			getOptionDisplayName={(val) => (val ? "Fast Apply" : "Slow Apply")}
			getOptionDropdownName={(val) => (val ? "Fast Apply" : "Slow Apply")}
			getOptionDropdownDetail={(val) =>
				val ? "Output Search/Replace blocks" : "Rewrite whole files"
			}
			getOptionsEqual={(a, b) => a === b}
		/>
	);
};

const RedoOnboardingButton = ({ className }: { className?: string }) => {
	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	return (
		<div
			className={`text-void-fg-4 flex flex-nowrap text-nowrap items-center hover:brightness-110 cursor-pointer ${className}`}
			onClick={() => {
				voidSettingsService.setGlobalSetting("isOnboardingComplete", false);
			}}
		>
			See onboarding screen?
		</div>
	);
};

export const ToolApprovalTypeSwitch = ({
	approvalType,
	size,
	desc,
}: {
	approvalType: ToolApprovalType;
	size: "xxs" | "xs" | "sm" | "sm+" | "md";
	desc: string;
}) => {
	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	const voidSettingsState = useSettingsState();
	const metricsService = accessor.get("IMetricsService");

	const onToggleAutoApprove = useCallback(
		(approvalType: ToolApprovalType, newValue: boolean) => {
			voidSettingsService.setGlobalSetting("autoApprove", {
				...voidSettingsService.state.globalSettings.autoApprove,
				[approvalType]: newValue,
			});
			metricsService.capture("Tool Auto-Accept Toggle", { enabled: newValue });
		},
		[voidSettingsService, metricsService]
	);

	return (
		<>
			<VoidSwitch
				size={size}
				value={
					voidSettingsState.globalSettings.autoApprove[approvalType] ?? false
				}
				onChange={(newVal) => onToggleAutoApprove(approvalType, newVal)}
			/>
			<span className="text-void-fg-3 text-xs">{desc}</span>
		</>
	);
};

// full settings

export const Settings = () => {
	const isDark = useIsDark();
	// ─── sidebar nav ──────────────────────────
	const [selectedSection, setSelectedSection] = useState<Tab>("models");

	const navItems: { tab: Tab; label: string }[] = [
		{ tab: "models", label: "Models" },
		{ tab: "localProviders", label: "Local Providers" },
		{ tab: "providers", label: "Main Providers" },
		{ tab: "featureOptions", label: "Feature Options" },
		{ tab: "general", label: "General" },
		{ tab: "mcp", label: "MCP" },
		{ tab: "all", label: "All Settings" },
	];
	const shouldShowTab = (tab: Tab) =>
		selectedSection === "all" || selectedSection === tab;
	const accessor = useAccessor();
	const commandService = accessor.get("ICommandService");
	const environmentService = accessor.get("IEnvironmentService");
	const nativeHostService = accessor.get("INativeHostService");
	const settingsState = useSettingsState();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	const chatThreadsService = accessor.get("IChatThreadService");
	const notificationService = accessor.get("INotificationService");
	const mcpService = accessor.get("IMCPService");
	const storageService = accessor.get("IStorageService");
	const metricsService = accessor.get("IMetricsService");
	const isOptedOut = useIsOptedOut();

	const onDownload = (t: "Chats" | "Settings") => {
		let dataStr: string;
		let downloadName: string;
		if (t === "Chats") {
			// Export chat threads
			dataStr = JSON.stringify(chatThreadsService.state, null, 2);
			downloadName = "void-chats.json";
		} else if (t === "Settings") {
			// Export user settings
			dataStr = JSON.stringify(voidSettingsService.state, null, 2);
			downloadName = "void-settings.json";
		} else {
			dataStr = "";
			downloadName = "";
		}

		const blob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = downloadName;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Add file input refs
	const fileInputSettingsRef = useRef<HTMLInputElement>(null);
	const fileInputChatsRef = useRef<HTMLInputElement>(null);

	const [s, ss] = useState(0);

	const handleUpload =
		(t: "Chats" | "Settings") => (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files) return;
			const file = files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				try {
					const json = JSON.parse(reader.result as string);

					if (t === "Chats") {
						chatThreadsService.dangerousSetState(json as any);
					} else if (t === "Settings") {
						voidSettingsService.dangerousSetState(json as any);
					}

					notificationService.info(`${t} imported successfully!`);
				} catch (err) {
					notificationService.notify({
						message: `Failed to import ${t}`,
						source: err + "",
						severity: Severity.Error,
					});
				}
			};
			reader.readAsText(file);
			e.target.value = "";

			ss((s) => s + 1);
		};

	return (
		<div
			className={`@@void-scope ${isDark ? "dark" : ""}`}
			style={{ height: "100%", width: "100%", overflow: "auto" }}
		>
			<div
				className="flex flex-col md:flex-row w-full gap-6 max-w-[900px] mx-auto mb-32"
				style={{ minHeight: "80vh" }}
			>
				{/* ──────────────  SIDEBAR  ────────────── */}

				<aside className="md:w-1/4 w-full p-6 shrink-0">
					{/* vertical tab list */}
					<div className="flex flex-col gap-2 mt-12">
						{navItems.map(({ tab, label }) => (
							<button
								key={tab}
								onClick={() => {
									if (tab === "all") {
										setSelectedSection("all");
										window.scrollTo({ top: 0, behavior: "smooth" });
									} else {
										setSelectedSection(tab);
									}
								}}
								className={`
          py-2 px-4 rounded-md text-left transition-all duration-200
          ${selectedSection === tab
										? "bg-[#0e70c0]/80 text-white font-medium shadow-sm"
										: "bg-void-bg-2 hover:bg-void-bg-2/80 text-void-fg-1"
									}
        `}
							>
								{label}
							</button>
						))}
					</div>
				</aside>

				{/* ───────────── MAIN PANE ───────────── */}
				<main className="flex-1 p-6 select-none">
					<div className="max-w-3xl">
						<h1 className="text-2xl w-full">{`Tars's Settings`}</h1>

						<div className="w-full h-[1px] my-2" />

						{/* Models section (formerly FeaturesTab) */}
						<ErrorBoundary>
							<RedoOnboardingButton />
						</ErrorBoundary>

						<div className="w-full h-[1px] my-4" />

						{/* All sections in flex container with gap-12 */}
						<div className="flex flex-col gap-12">
							{/* Models section (formerly FeaturesTab) */}
							<div className={shouldShowTab("models") ? `` : "hidden"}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Models</h2>
									<ModelDump />
									<div className="w-full h-[1px] my-4" />
									<AutoDetectLocalModelsToggle />
									<RefreshableModels />
								</ErrorBoundary>
							</div>

							{/* Local Providers section */}
							<div className={shouldShowTab("localProviders") ? `` : "hidden"}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Local Providers</h2>
									<h3
										className={`text-void-fg-3 mb-2`}
									>{`Void can access any model that you host locally. We automatically detect your local models by default.`}</h3>

									<div className="opacity-80 mb-4">
										<OllamaSetupInstructions sayWeAutoDetect={true} />
									</div>

									<TarsProviderSettings providerNames={localProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Main Providers section */}
							<div className={shouldShowTab("providers") ? `` : "hidden"}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Main Providers</h2>
									<h3
										className={`text-void-fg-3 mb-2`}
									>{`Void can access models from Anthropic, OpenAI, OpenRouter, and more.`}</h3>

									<TarsProviderSettings providerNames={nonlocalProviderNames} />
								</ErrorBoundary>
							</div>

							{/* Feature Options section */}
							<div className={shouldShowTab("featureOptions") ? `` : "hidden"}>
								<ErrorBoundary>
									<h2 className={`text-3xl mb-2`}>Feature Options</h2>

									<div className="flex flex-col gap-y-8 my-4">
										<ErrorBoundary>
											{/* FIM */}
											<div>
												<h4 className={`text-base`}>
													{displayInfoOfFeatureName("Autocomplete")}
												</h4>
												<div className="text-sm text-void-fg-3 mt-1">
													<span>Experimental. </span>
													<span
														className="hover:brightness-110"
														data-tooltip-id="void-tooltip"
														data-tooltip-content="We recommend using the largest qwen2.5-coder model you can with Ollama (try qwen2.5-coder:3b)."
														data-tooltip-class-name="void-max-w-[20px]"
													>
														Only works with FIM models.*
													</span>
												</div>

												<div className="my-2">
													{/* Enable Switch */}
													<ErrorBoundary>
														<div className="flex items-center gap-x-2 my-2">
															<VoidSwitch
																size="xs"
																value={
																	settingsState.globalSettings
																		.enableAutocomplete
																}
																onChange={(newVal) =>
																	voidSettingsService.setGlobalSetting(
																		"enableAutocomplete",
																		newVal
																	)
																}
															/>
															<span className="text-void-fg-3 text-xs pointer-events-none">
																{settingsState.globalSettings.enableAutocomplete
																	? "Enabled"
																	: "Disabled"}
															</span>
														</div>
													</ErrorBoundary>

													{/* Model Dropdown */}
													<ErrorBoundary>
														<div
															className={`my-2 ${!settingsState.globalSettings.enableAutocomplete
																? "hidden"
																: ""
																}`}
														>
															<ModelDropdown
																featureName={"Autocomplete"}
																className="text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-1 rounded p-0.5 px-1"
															/>
														</div>
													</ErrorBoundary>
												</div>
											</div>
										</ErrorBoundary>

										{/* Apply */}
										<ErrorBoundary>
											<div className="w-full">
												<h4 className={`text-base`}>
													{displayInfoOfFeatureName("Apply")}
												</h4>
												<div className="text-sm text-void-fg-3 mt-1">
													Settings that control the behavior of the Apply
													button.
												</div>

												<div className="my-2">
													{/* Sync to Chat Switch */}
													<div className="flex items-center gap-x-2 my-2">
														<VoidSwitch
															size="xs"
															value={
																settingsState.globalSettings.syncApplyToChat
															}
															onChange={(newVal) =>
																voidSettingsService.setGlobalSetting(
																	"syncApplyToChat",
																	newVal
																)
															}
														/>
														<span className="text-void-fg-3 text-xs pointer-events-none">
															{settingsState.globalSettings.syncApplyToChat
																? "Same as Chat model"
																: "Different model"}
														</span>
													</div>

													{/* Model Dropdown */}
													<div
														className={`my-2 ${settingsState.globalSettings.syncApplyToChat
															? "hidden"
															: ""
															}`}
													>
														<ModelDropdown
															featureName={"Apply"}
															className="text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-1 rounded p-0.5 px-1"
														/>
													</div>
												</div>

												<div className="my-2">
													{/* Fast Apply Method Dropdown */}
													<div className="flex items-center gap-x-2 my-2">
														<FastApplyMethodDropdown />
													</div>
												</div>
											</div>
										</ErrorBoundary>

										{/* Tools Section */}
										<div>
											<h4 className={`text-base`}>Tools</h4>
											<div className="text-sm text-void-fg-3 mt-1">{`Tools are functions that LLMs can call. Some tools require user approval.`}</div>

											<div className="my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													{[...toolApprovalTypes].map((approvalType) => {
														return (
															<div
																key={approvalType}
																className="flex items-center gap-x-2 my-2"
															>
																<ToolApprovalTypeSwitch
																	size="xs"
																	approvalType={approvalType}
																	desc={`Auto-approve ${approvalType}`}
																/>
															</div>
														);
													})}
												</ErrorBoundary>

												{/* Tool Lint Errors Switch */}
												<ErrorBoundary>
													<div className="flex items-center gap-x-2 my-2">
														<VoidSwitch
															size="xs"
															value={
																settingsState.globalSettings
																	.includeToolLintErrors
															}
															onChange={(newVal) =>
																voidSettingsService.setGlobalSetting(
																	"includeToolLintErrors",
																	newVal
																)
															}
														/>
														<span className="text-void-fg-3 text-xs pointer-events-none">
															{settingsState.globalSettings
																.includeToolLintErrors
																? "Fix lint errors"
																: `Fix lint errors`}
														</span>
													</div>
												</ErrorBoundary>

												{/* Auto Accept LLM Changes Switch */}
												<ErrorBoundary>
													<div className="flex items-center gap-x-2 my-2">
														<VoidSwitch
															size="xs"
															value={
																settingsState.globalSettings
																	.autoAcceptLLMChanges
															}
															onChange={(newVal) =>
																voidSettingsService.setGlobalSetting(
																	"autoAcceptLLMChanges",
																	newVal
																)
															}
														/>
														<span className="text-void-fg-3 text-xs pointer-events-none">
															Auto-accept LLM changes
														</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										<div className="w-full">
											<h4 className={`text-base`}>Editor</h4>
											<div className="text-sm text-void-fg-3 mt-1">{`Settings that control the visibility of Void suggestions in the code editor.`}</div>

											<div className="my-2">
												{/* Auto Accept Switch */}
												<ErrorBoundary>
													<div className="flex items-center gap-x-2 my-2">
														<VoidSwitch
															size="xs"
															value={
																settingsState.globalSettings
																	.showInlineSuggestions
															}
															onChange={(newVal) =>
																voidSettingsService.setGlobalSetting(
																	"showInlineSuggestions",
																	newVal
																)
															}
														/>
														<span className="text-void-fg-3 text-xs pointer-events-none">
															{settingsState.globalSettings
																.showInlineSuggestions
																? "Show suggestions on select"
																: "Show suggestions on select"}
														</span>
													</div>
												</ErrorBoundary>
											</div>
										</div>

										{/* SCM */}
										<ErrorBoundary>
											<div className="w-full">
												<h4 className={`text-base`}>
													{displayInfoOfFeatureName("SCM")}
												</h4>
												<div className="text-sm text-void-fg-3 mt-1">
													Settings that control the behavior of the commit
													message generator.
												</div>

												<div className="my-2">
													{/* Sync to Chat Switch */}
													<div className="flex items-center gap-x-2 my-2">
														<VoidSwitch
															size="xs"
															value={settingsState.globalSettings.syncSCMToChat}
															onChange={(newVal) =>
																voidSettingsService.setGlobalSetting(
																	"syncSCMToChat",
																	newVal
																)
															}
														/>
														<span className="text-void-fg-3 text-xs pointer-events-none">
															{settingsState.globalSettings.syncSCMToChat
																? "Same as Chat model"
																: "Different model"}
														</span>
													</div>

													{/* Model Dropdown */}
													<div
														className={`my-2 ${settingsState.globalSettings.syncSCMToChat
															? "hidden"
															: ""
															}`}
													>
														<ModelDropdown
															featureName={"SCM"}
															className="text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-1 rounded p-0.5 px-1"
														/>
													</div>
												</div>
											</div>
										</ErrorBoundary>
									</div>
								</ErrorBoundary>
							</div>

							{/* General section */}
							<div
								className={`${shouldShowTab("general") ? `` : "hidden"
									} flex flex-col gap-12`}
							>
								{/* One-Click Switch section */}
								<div>
									<ErrorBoundary>
										<h2 className="text-3xl mb-2">One-Click Switch</h2>
										<h4 className="text-void-fg-3 mb-4">{`Transfer your editor settings into Void.`}</h4>

										<div className="flex flex-col gap-2">
											<OneClickSwitchButton
												className="w-48"
												fromEditor="VS Code"
											/>
											<OneClickSwitchButton
												className="w-48"
												fromEditor="Cursor"
											/>
											<OneClickSwitchButton
												className="w-48"
												fromEditor="Windsurf"
											/>
										</div>
									</ErrorBoundary>
								</div>

								{/* Import/Export section */}
								<div>
									<h2 className="text-3xl mb-2">Import/Export</h2>
									<h4 className="text-void-fg-3 mb-4">{`Transfer Tars's settings and chats in and out of Void.`}</h4>
									<div className="flex flex-col gap-8">
										{/* Settings Subcategory */}
										<div className="flex flex-col gap-2 max-w-48 w-full">
											<input
												key={2 * s}
												ref={fileInputSettingsRef}
												type="file"
												accept=".json"
												className="hidden"
												onChange={handleUpload("Settings")}
											/>
											<VoidButtonBgDarken
												className="px-4 py-1 w-full"
												onClick={() => {
													fileInputSettingsRef.current?.click();
												}}
											>
												Import Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken
												className="px-4 py-1 w-full"
												onClick={() => onDownload("Settings")}
											>
												Export Settings
											</VoidButtonBgDarken>
											<ConfirmButton
												className="px-4 py-1 w-full"
												onConfirm={() => {
													voidSettingsService.resetState();
												}}
											>
												Reset Settings
											</ConfirmButton>
										</div>

										{/* Chats Subcategory */}
										<div className="flex flex-col gap-2 max-w-48 w-full">
											<input
												key={2 * s + 1}
												ref={fileInputChatsRef}
												type="file"
												accept=".json"
												className="hidden"
												onChange={handleUpload("Chats")}
											/>
											<VoidButtonBgDarken
												className="px-4 py-1 w-full"
												onClick={() => {
													fileInputChatsRef.current?.click();
												}}
											>
												Import Chats
											</VoidButtonBgDarken>
											<VoidButtonBgDarken
												className="px-4 py-1 w-full"
												onClick={() => onDownload("Chats")}
											>
												Export Chats
											</VoidButtonBgDarken>
											<ConfirmButton
												className="px-4 py-1 w-full"
												onConfirm={() => {
													chatThreadsService.resetState();
												}}
											>
												Reset Chats
											</ConfirmButton>
										</div>
									</div>
								</div>

								{/* Built-in Settings section */}
								<div>
									<h2 className={`text-3xl mb-2`}>Built-in Settings</h2>
									<h4
										className={`text-void-fg-3 mb-4`}
									>{`IDE settings, keyboard settings, and theme customization.`}</h4>

									<ErrorBoundary>
										<div className="flex flex-col gap-2 justify-center max-w-48 w-full">
											<VoidButtonBgDarken
												className="px-4 py-1"
												onClick={() => {
													commandService.executeCommand(
														"workbench.action.openSettings"
													);
												}}
											>
												General Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken
												className="px-4 py-1"
												onClick={() => {
													commandService.executeCommand(
														"workbench.action.openGlobalKeybindings"
													);
												}}
											>
												Keyboard Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken
												className="px-4 py-1"
												onClick={() => {
													commandService.executeCommand(
														"workbench.action.selectTheme"
													);
												}}
											>
												Theme Settings
											</VoidButtonBgDarken>
											<VoidButtonBgDarken
												className="px-4 py-1"
												onClick={() => {
													nativeHostService.showItemInFolder(
														environmentService.logsHome.fsPath
													);
												}}
											>
												Open Logs
											</VoidButtonBgDarken>
										</div>
									</ErrorBoundary>
								</div>

								{/* Metrics section */}
								<div className="max-w-[600px]">
									<h2 className={`text-3xl mb-2`}>Metrics</h2>
									<h4 className={`text-void-fg-3 mb-4`}>
										Very basic anonymous usage tracking helps us keep Void
										running smoothly. You may opt out below. Regardless of this
										setting, Void never sees your code, messages, or API keys.
									</h4>

									<div className="my-2">
										{/* Disable All Metrics Switch */}
										<ErrorBoundary>
											<div className="flex items-center gap-x-2 my-2">
												<VoidSwitch
													size="xs"
													value={isOptedOut}
													onChange={(newVal) => {
														storageService.store(
															OPT_OUT_KEY,
															newVal,
															StorageScope.APPLICATION,
															StorageTarget.MACHINE
														);
														metricsService.capture(
															`Set metrics opt-out to ${newVal}`,
															{}
														); // this only fires if it's enabled, so it's fine to have here
													}}
												/>
												<span className="text-void-fg-3 text-xs pointer-events-none">
													{"Opt-out (requires restart)"}
												</span>
											</div>
										</ErrorBoundary>
									</div>
								</div>

								{/* AI Instructions section */}
								<div className="max-w-[600px]">
									<h2 className={`text-3xl mb-2`}>AI Instructions</h2>
									<h4 className={`text-void-fg-3 mb-4`}>
										<ChatMarkdownRender
											inPTag={true}
											string={`
System instructions to include with all AI requests.
Alternatively, place a \`.voidrules\` file in the root of your workspace.
								`}
											chatMessageLocation={undefined}
										/>
									</h4>
									<ErrorBoundary>
										<AIInstructionsBox />
									</ErrorBoundary>
									{/* --- Disable System Message Toggle --- */}
									<div className="my-4">
										<ErrorBoundary>
											<div className="flex items-center gap-x-2">
												<VoidSwitch
													size="xs"
													value={
														!!settingsState.globalSettings.disableSystemMessage
													}
													onChange={(newValue) => {
														voidSettingsService.setGlobalSetting(
															"disableSystemMessage",
															newValue
														);
													}}
												/>
												<span className="text-void-fg-3 text-xs pointer-events-none">
													{"Disable system message"}
												</span>
											</div>
										</ErrorBoundary>
										<div className="text-void-fg-3 text-xs mt-1">
											{`When disabled, Void will not include anything in the system message except for content you specified above.`}
										</div>
									</div>
								</div>
							</div>

							{/* MCP section */}
							<div className={shouldShowTab("mcp") ? `` : "hidden"}>
								<ErrorBoundary>
									<h2 className="text-3xl mb-2">MCP</h2>
									<h4 className={`text-void-fg-3 mb-4`}>
										<ChatMarkdownRender
											inPTag={true}
											string={`
Use Model Context Protocol to provide Agent mode with more tools.
							`}
											chatMessageLocation={undefined}
										/>
									</h4>
									<div className="my-2">
										<VoidButtonBgDarken
											className="px-4 py-1 w-full max-w-48"
											onClick={async () => {
												await mcpService.revealMCPConfigFile();
											}}
										>
											Add MCP Server
										</VoidButtonBgDarken>
									</div>

									<ErrorBoundary>
										<MCPServersList />
									</ErrorBoundary>
								</ErrorBoundary>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};
