'use client';

export interface ChainOption {
  id: string;
  name: string;
  symbol: string;
  isSupported: boolean;
  badge?: string;
}

export const SUPPORTED_CHAINS: ChainOption[] = [
  { id: 'stellar', name: 'Stellar', symbol: 'XLM', isSupported: true },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', isSupported: false, badge: 'Coming Soon' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', isSupported: false, badge: 'Coming Soon' },
  { id: 'soroban', name: 'Soroban Smart Contracts', symbol: 'XLM', isSupported: false, badge: 'Coming Soon' },
];

type ChainSelectorProps = {
  selectedChainId: string;
  onSelectChain?: (chainId: string) => void;
  label?: string;
};

export function ChainSelector({
  selectedChainId = 'stellar',
  onSelectChain,
  label = 'Select Network / Chain',
}: ChainSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="chain-selector" className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      <select
        id="chain-selector"
        value={selectedChainId}
        onChange={(e) => onSelectChain?.(e.target.value)}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option
            key={chain.id}
            value={chain.id}
            disabled={!chain.isSupported}
          >
            {chain.name} ({chain.symbol}) {!chain.isSupported ? `— [${chain.badge}]` : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        Bridgelet currently operates on the <strong>Stellar</strong> network. Multi-chain EVM & Soroban support is under development.
      </p>
    </div>
  );
}
