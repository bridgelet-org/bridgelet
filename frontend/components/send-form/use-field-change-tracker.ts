import { useCallback, useRef, type FocusEvent } from 'react';
import { analytics, type SendFormFieldName } from '@/lib/analytics';

type TrackedElement = HTMLInputElement | HTMLSelectElement;

/**
 * Drives the `Send Form Field Changed` event (`docs/analytics-spec.md` §4.2).
 *
 * The spec asks for one event when the sender changes a value and moves focus
 * away, and explicitly not one per keystroke. The value is remembered on
 * focus and compared on blur, so focusing a field and leaving it untouched,
 * or editing it back to what it was, fires nothing.
 *
 * Usage: spread `tracked('amount')` onto an `<input>` or `<select>`.
 */
export function useFieldChangeTracker() {
  const valueOnFocus = useRef<Partial<Record<SendFormFieldName, string>>>({});

  return useCallback((field: SendFormFieldName) => {
    return {
      onFocus: (event: FocusEvent<TrackedElement>) => {
        valueOnFocus.current[field] = event.currentTarget.value;
      },
      onBlur: (event: FocusEvent<TrackedElement>) => {
        const before = valueOnFocus.current[field];
        delete valueOnFocus.current[field];
        const after = event.currentTarget.value;
        if (before === undefined || before === after) return;
        analytics.sendFormFieldChanged({
          fieldName: field,
          assetType: field === 'asset' ? after : undefined,
        });
      },
    };
  }, []);
}
