/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ModelFacts } from "@/features/models/components/ModelFacts";
import { ModelSection } from "@/features/models/components/ModelSection";
import type { RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";

/** The environment MLsuite runs the model in, as the server prepared it. */
export function ModelEnvironmentSection({ environment }: { environment: RuntimeEnvironmentDto }) {
  return (
    <ModelSection
      title="Environment"
      note={
        environment.legacy
          ? "Where MLsuite runs this model: the fixed environment kept for bundles written before mlbundle 0.3."
          : "Where MLsuite runs this model: built from the packages its bundle locks."
      }
    >
      <ModelFacts
        facts={[
          { label: "Python", value: environment.pythonVersion, mono: true },
          { label: "mlbundle", value: environment.writerVersion, mono: true },
          {
            label: "Kind",
            value: environment.legacy ? "Legacy environment" : "Locked by the bundle",
          },
        ]}
      />
      {environment.packages.length > 0 ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Packages in the environment</caption>
          <thead>
            <tr className="text-left text-xs text-fg-muted">
              <th scope="col" className="py-1.5 font-medium">
                Package
              </th>
              <th scope="col" className="py-1.5 font-medium">
                Version
              </th>
            </tr>
          </thead>
          <tbody>
            {environment.packages.map((item) => (
              <tr key={item.name} className="border-t border-line">
                <td className="py-1.5 pr-4 text-fg">{item.name}</td>
                <td className="py-1.5 font-mono text-fg-secondary">{item.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </ModelSection>
  );
}
