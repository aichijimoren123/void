
export const VoidSwitch = ({
	value,
	onChange,
	size = 'md',
	disabled = false,
	...props
}: {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	size?: 'xxs' | 'xs' | 'sm' | 'sm+' | 'md';
}) => {
	return (
		<label className="inline-flex items-center" {...props}>
			<div
				onClick={() => !disabled && onChange(!value)}
				className={`
			cursor-pointer
			relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
			${value ? 'bg-zinc-900 dark:bg-white' : 'bg-white dark:bg-zinc-600'}
			${disabled ? 'opacity-25' : ''}
			${size === 'xxs' ? 'h-3 w-5' : ''}
			${size === 'xs' ? 'h-4 w-7' : ''}
			${size === 'sm' ? 'h-5 w-9' : ''}
			${size === 'sm+' ? 'h-5 w-10' : ''}
			${size === 'md' ? 'h-6 w-11' : ''}
		  `}
			>
				<span
					className={`
			  inline-block transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform duration-200 ease-in-out
			  ${size === 'xxs' ? 'h-2 w-2' : ''}
			  ${size === 'xs' ? 'h-2.5 w-2.5' : ''}
			  ${size === 'sm' ? 'h-3 w-3' : ''}
			  ${size === 'sm+' ? 'h-3.5 w-3.5' : ''}
			  ${size === 'md' ? 'h-4 w-4' : ''}
			  ${size === 'xxs' ? (value ? 'translate-x-2.5' : 'translate-x-0.5') : ''}
			  ${size === 'xs' ? (value ? 'translate-x-3.5' : 'translate-x-0.5') : ''}
			  ${size === 'sm' ? (value ? 'translate-x-5' : 'translate-x-1') : ''}
			  ${size === 'sm+' ? (value ? 'translate-x-6' : 'translate-x-1') : ''}
			  ${size === 'md' ? (value ? 'translate-x-6' : 'translate-x-1') : ''}
			`}
				/>
			</div>
		</label>
	);
};

