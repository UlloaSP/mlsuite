/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "../../app/components/ui-controls";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";
import type { SignatureDto } from "../api/modelService";
import { getSignatureSummaryStats, getSignatureVersionLabel } from "../utils";

type SignatureTechnicalTabProps = {
  signature: SignatureDto;
};

function KeyValueList({ items }: { items: Record<string, number> }) {
  const entries = Object.entries(items);
  if (entries.length === 0) {
    return <AppCopy>No entries detected.</AppCopy>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <AppBadge key={key}>
          {key}: {value}
        </AppBadge>
      ))}
    </div>
  );
}

export function SignatureTechnicalTab({ signature }: SignatureTechnicalTabProps) {
  const stats = getSignatureSummaryStats(signature.inputSignature);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AppPanel className="space-y-4">
        <AppSectionTitle>Schema Overview</AppSectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Fields</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {stats.fieldCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Reports</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {stats.reportCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Explanations
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {stats.explanationsEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Prediction Form Readiness</AppSectionTitle>
        <AppBadge tone="success">ready</AppBadge>
        <AppCopy>
          This schema is ready to power the prediction form used in the create prediction flow.
        </AppCopy>
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Field Types</AppSectionTitle>
        <KeyValueList items={stats.fieldKinds} />
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Report Types</AppSectionTitle>
        <KeyValueList items={stats.reportKinds} />
        {stats.classifierLabelsCount > 0 ? (
          <AppCopy>Classifier labels detected: {stats.classifierLabelsCount}</AppCopy>
        ) : null}
      </AppPanel>

      <AppPanel className="space-y-4 xl:col-span-2">
        <AppSectionTitle>Lineage</AppSectionTitle>
        {signature.origin ? (
          <AppCopy>
            Based on {signature.origin.name} · {getSignatureVersionLabel(signature.origin)}
          </AppCopy>
        ) : (
          <AppCopy>Initial version. No previous schema origin is attached.</AppCopy>
        )}
      </AppPanel>
    </div>
  );
}
