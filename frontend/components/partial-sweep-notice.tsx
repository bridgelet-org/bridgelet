// #123 – UI for partial sweep scenario (future backend feature)
type AssetStatus = { assetCode: string; success: boolean; errorReason?: string };

type Props = { assets: AssetStatus[] };

export function PartialSweepNotice({ assets }: Props) {
  const succeeded = assets.filter((a) => a.success);
  const failed = assets.filter((a) => !a.success);

  if (failed.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-amber-800">
        Partial transfer — some assets could not be swept
      </p>
      {succeeded.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-700 mb-1">Transferred successfully:</p>
          <ul className="list-disc list-inside text-xs text-green-700 space-y-0.5">
            {succeeded.map((a) => (
              <li key={a.assetCode}>{a.assetCode}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-red-700 mb-1">Could not transfer:</p>
        <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
          {failed.map((a) => (
            <li key={a.assetCode}>
              {a.assetCode}
              {a.errorReason ? ` — ${a.errorReason}` : ''}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-amber-700">
        Please contact support and reference this claim. The failed assets remain in the ephemeral
        account.
      </p>
    </div>
  );
}
