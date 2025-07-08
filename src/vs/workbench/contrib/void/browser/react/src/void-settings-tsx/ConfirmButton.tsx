import React, { useEffect, useState, useRef } from "react"; // Added useRef import just in case it was missed, though likely already present
import { VoidButtonBgDarken } from "../util/DarkenBgButton.js";

// ConfirmButton prompts for a second click to confirm an action, cancels if clicking outside
export const ConfirmButton = ({
	children,
	onConfirm,
	className,
}: {
	children: React.ReactNode;
	onConfirm: () => void;
	className?: string;
}) => {
	const [confirm, setConfirm] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!confirm) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setConfirm(false);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, [confirm]);
	return (
		<div ref={ref} className={`inline-block`}>
			<VoidButtonBgDarken
				className={className}
				onClick={() => {
					if (!confirm) {
						setConfirm(true);
					} else {
						onConfirm();
						setConfirm(false);
					}
				}}
			>
				{confirm ? `Confirm Reset` : children}
			</VoidButtonBgDarken>
		</div>
	);
};
