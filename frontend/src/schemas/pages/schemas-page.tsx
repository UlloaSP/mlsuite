/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { Link } from "react-router";
import {
  AppButton,
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSurface,
} from "../../app/components";
import { useSchemas } from "../hooks";

export function SchemasPage() {
  const { data: schemas = [], isLoading } = useSchemas();

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          eyebrow="Schemas"
          title="Organization schemas"
          actions={
            <Link to="/schemas/create">
              <AppButton>
                <Plus size={16} />
                New schema
              </AppButton>
            </Link>
          }
        />
        {isLoading ? (
          <AppPanel>Loading schemas...</AppPanel>
        ) : schemas.length === 0 ? (
          <AppEmptyState
            title="No schemas"
            description="Create an organization-level form snapshot and bind models to it."
            action={
              <Link to="/schemas/create">
                <AppButton>New schema</AppButton>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {schemas.map((schema) => (
              <Link key={schema.id} to={`/schemas/${schema.id}`}>
                <AppPanel className="h-full space-y-3 transition hover:border-[var(--text-primary)]">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {schema.name}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">Organization-level form</p>
                </AppPanel>
              </Link>
            ))}
          </div>
        )}
      </AppSurface>
    </AppPage>
  );
}
