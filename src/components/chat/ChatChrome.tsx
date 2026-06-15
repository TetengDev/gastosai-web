// Presentational, stateless chrome for the chat widget. Extracted from ChatWidget for readability;
// behavior is unchanged.

export function TypingDots({ dotClass }: { dotClass: string }) {
  return (
    <div className="flex gap-1 items-center py-0.5">
      <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${dotClass}`} />
      <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${dotClass}`} />
      <span className={`w-2 h-2 rounded-full animate-bounce ${dotClass}`} />
    </div>
  );
}

export function BotAvatar({ gradient }: { gradient: string }) {
  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none ${gradient}`}>
      G
    </div>
  );
}

export function ExpandIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

export function CollapseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25M9 15H4.5M9 15v4.5M9 15l-5.25 5.25" />
    </svg>
  );
}
