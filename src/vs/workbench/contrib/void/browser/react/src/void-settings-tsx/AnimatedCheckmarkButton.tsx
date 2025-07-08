import { useEffect, useState } from "react"; // Added useRef import just in case it was missed, though likely already present

export const AnimatedCheckmarkButton = ({
	text,
	className,
}: {
	text?: string;
	className?: string;
}) => {
	const [dashOffset, setDashOffset] = useState(40);

	useEffect(() => {
		const startTime = performance.now();
		const duration = 500; // 500ms animation

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const newOffset = 40 - progress * 40;

			setDashOffset(newOffset);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		const animationId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationId);
	}, []);

	return (
		<div
			className={`flex items-center gap-1.5 w-fit
			${className
					? className
					: `px-2 py-0.5 text-xs text-zinc-900 bg-zinc-100 rounded-sm`
				}
		`}
		>
			<svg
				className="size-4"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M5 13l4 4L19 7"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{
						strokeDasharray: 40,
						strokeDashoffset: dashOffset,
					}}
				/>
			</svg>
			{text}
		</div>
	);
};
