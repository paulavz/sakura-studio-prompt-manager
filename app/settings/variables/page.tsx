import { getMinVarLength, getMaxVarLength } from "@/lib/env";

export default function SettingsVariablesPage() {
  const min = getMinVarLength();
  const max = getMaxVarLength();

  return (
    <div data-testid="settings-variables-page">
      <h2 className="text-xl font-semibold tracking-tight text-black mb-6">
        Variables Drawer Defaults
      </h2>

      <dl className="space-y-4 max-w-sm">
        <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
          <dt className="text-sm text-gray-600">Minimum length</dt>
          <dd className="text-sm font-medium text-gray-900 font-mono">
            {min}
            <span className="ml-2 text-xs font-normal text-gray-400">MIN_VAR_LENGTH</span>
          </dd>
        </div>

        <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
          <dt className="text-sm text-gray-600">Maximum length</dt>
          <dd className="text-sm font-medium text-gray-900 font-mono">
            {max}
            <span className="ml-2 text-xs font-normal text-gray-400">MAX_VAR_LENGTH</span>
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-gray-400">
        These defaults are configured via environment variables. Edit{" "}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">.env.local</code>{" "}
        to change.
      </p>
    </div>
  );
}
