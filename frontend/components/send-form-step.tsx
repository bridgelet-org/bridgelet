type SendFormStepProps = {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  isLoading?: boolean;
};

export function SendFormStep({
  step,
  totalSteps,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  isLoading = false,
}: SendFormStepProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < step ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">
          Step {step} of {totalSteps}
        </span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">{children}</div>

      {/* Actions */}
      {(onBack || onNext) && (
        <div className="flex justify-between gap-3 pt-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={isLoading}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isLoading ? 'Please wait…' : nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
