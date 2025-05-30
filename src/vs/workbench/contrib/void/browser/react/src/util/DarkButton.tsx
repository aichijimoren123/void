export const VoidButtonBgDarken = ({ children, disabled, onClick, className }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; className?: string }) => {
    return <button disabled={disabled}
        className={`px-3 py-1 bg-black/10 dark:bg-white/10 rounded-sm overflow-hidden whitespace-nowrap flex items-center justify-center ${className || ''}`}
        onClick={onClick}
    >{children}</button>
}