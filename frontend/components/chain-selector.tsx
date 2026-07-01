export function ChainSelector() {
  return (
    <div className="space-y-1">
      <label htmlFor="chain-select" className="block text-sm font-medium text-slate-700">
        Network
      </label>
      <div className="relative group">
        <select
          id="chain-select"
          disabled
          className="block w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
        >
          <option value="stellar">Stellar Network</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {/* Tooltip for the disabled state */}
        <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-max rounded bg-slate-800 px-2 py-1 text-xs text-white">
          More chains coming soon
          <svg className="absolute top-full left-1/2 -translate-x-1/2 text-slate-800 h-2 w-2" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
      </div>
    </div>
  );
}
