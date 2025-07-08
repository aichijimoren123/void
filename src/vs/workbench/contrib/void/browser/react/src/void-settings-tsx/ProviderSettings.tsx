/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useCallback } from "react"; // Added useRef import just in case it was missed, though likely already present
import {
	ProviderName,
	SettingName,
	displayInfoOfSettingName,
	customSettingNamesOfProvider,
	displayInfoOfProviderName,
	isProviderNameDisabled,
	subTextMdOfProviderName,
} from "../../../../common/voidSettingsTypes.js";
import ErrorBoundary from "../sidebar-tsx/ErrorBoundary.js";
import { VoidSimpleInputBox } from "../util/SimpleInputBox.js";
import { useAccessor, useSettingsState } from "../util/services.js";
import { ChatMarkdownRender } from "../markdown/ChatMarkdownRender.js";
import { WarningBox } from "./WarningBox.js";

const ProviderSetting = ({
	providerName,
	settingName,
	subTextMd,
}: {
	providerName: ProviderName;
	settingName: SettingName;
	subTextMd: React.ReactNode;
}) => {
	const {
		title: settingTitle,
		placeholder,
		isPasswordField,
	} = displayInfoOfSettingName(providerName, settingName);

	const accessor = useAccessor();
	const voidSettingsService = accessor.get("IVoidSettingsService");
	const settingsState = useSettingsState();

	const settingValue = settingsState.settingsOfProvider[providerName][
		settingName
	] as string; // this should always be a string in this component
	if (typeof settingValue !== "string") {
		console.log("Error: Provider setting had a non-string value.");
		return;
	}

	// Create a stable callback reference using useCallback with proper dependencies
	const handleChangeValue = useCallback(
		(newVal: string) => {
			voidSettingsService.setSettingOfProvider(
				providerName,
				settingName,
				newVal
			);
		},
		[voidSettingsService, providerName, settingName]
	);

	return (
		<ErrorBoundary>
			<div className="my-1">
				<VoidSimpleInputBox
					value={settingValue}
					onChangeValue={handleChangeValue}
					placeholder={`${settingTitle} (${placeholder})`}
					passwordBlur={isPasswordField}
					compact={true}
				/>
				{!subTextMd ? null : (
					<div className="py-1 px-3 opacity-50 text-sm">{subTextMd}</div>
				)}
			</div>
		</ErrorBoundary>
	);
};

export const SettingsForProvider = ({
	providerName,
	showProviderTitle,
	showProviderSuggestions,
}: {
	providerName: ProviderName;
	showProviderTitle: boolean;
	showProviderSuggestions: boolean;
}) => {
	const voidSettingsState = useSettingsState();

	const needsModel =
		isProviderNameDisabled(providerName, voidSettingsState) === "addModel";

	// const accessor = useAccessor()
	// const voidSettingsService = accessor.get('IVoidSettingsService')

	// const { enabled } = voidSettingsState.settingsOfProvider[providerName]
	const settingNames = customSettingNamesOfProvider(providerName);

	const { title: providerTitle } = displayInfoOfProviderName(providerName);

	return (
		<div>
			<div className="flex items-center w-full gap-4">
				{showProviderTitle && (
					<h3 className="text-xl truncate">{providerTitle}</h3>
				)}

				{/* enable provider switch */}
				{/* <VoidSwitch
				value={!!enabled}
				onChange={
					useCallback(() => {
						const enabledRef = voidSettingsService.state.settingsOfProvider[providerName].enabled
						voidSettingsService.setSettingOfProvider(providerName, 'enabled', !enabledRef)
					}, [voidSettingsService, providerName])}
				size='sm+'
			/> */}
			</div>

			<div className="px-0">
				{/* settings besides models (e.g. api key) */}
				{settingNames.map((settingName, i) => {
					return (
						<ProviderSetting
							key={settingName}
							providerName={providerName}
							settingName={settingName}
							subTextMd={
								i !== settingNames.length - 1 ? null : (
									<ChatMarkdownRender
										string={subTextMdOfProviderName(providerName)}
										chatMessageLocation={undefined}
									/>
								)
							}
						/>
					);
				})}

				{showProviderSuggestions && needsModel ? (
					providerName === "ollama" ? (
						<WarningBox
							className="pl-2 mb-4"
							text={`Please install an Ollama model. We'll auto-detect it.`}
						/>
					) : (
						<WarningBox
							className="pl-2 mb-4"
							text={`Please add a model for ${providerTitle} (Models section).`}
						/>
					)
				) : null}
			</div>
		</div>
	);
};

export const TarsProviderSettings = ({
	providerNames,
}: {
	providerNames: ProviderName[];
}) => {
	return (
		<>
			{providerNames.map((providerName) => (
				<SettingsForProvider
					key={providerName}
					providerName={providerName}
					showProviderTitle={true}
					showProviderSuggestions={true}
				/>
			))}
		</>
	);
};
