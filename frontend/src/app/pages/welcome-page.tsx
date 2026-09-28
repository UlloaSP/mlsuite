/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useSectionMemory } from "@/app/components/section-memory";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { WelcomeVisitPanel } from "@/app/components/welcome/WelcomeVisitPanel";
import { WelcomeVisitTabs, type ResumableVisit } from "@/app/components/welcome/WelcomeVisitTabs";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

/**
 * Shown after signing in: one tab per section the member can still open with
 * where they last were in it, most recent first. With nothing to resume it
 * steps aside for the usual home.
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const organization = useWorkspaceContext().data?.currentOrganization;
  const { navigation, administration } = useNavigationItems();
  const { recall, forget, forgetAll } = useSectionMemory();
  const [selected, setSelected] = useState<string>();
  // Sections come from the navigation, so lost access means no tab.
  const resumable = [...navigation, ...administration]
    .map((section) => ({ section, visit: recall(section.root) }))
    .filter((item): item is ResumableVisit => Boolean(item.visit))
    .sort((left, right) => right.visit.at.localeCompare(left.visit.at));

  if (resumable.length === 0) return <Navigate to="/home" replace />;

  const current = resumable.find((item) => item.section.root === selected) ?? resumable[0];
  const firstName = user?.fullName.trim().split(/\s+/)[0];

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          description={
            organization
              ? `Pick up where you left off in ${organization.name}.`
              : "Pick up where you left off."
          }
          breadcrumbs={[{ label: "Welcome back" }]}
          actions={
            <AppButton
              variant="secondary"
              onClick={() => {
                forgetAll();
                void navigate("/home", { replace: true });
              }}
            >
              Start fresh
            </AppButton>
          }
        />
        <div className="flex flex-col gap-4">
          <WelcomeVisitTabs
            items={resumable}
            selected={current.section.root}
            onSelect={setSelected}
            onForget={forget}
          />
          <WelcomeVisitPanel section={current.section} visit={current.visit} />
        </div>
      </AppSurface>
    </AppPage>
  );
}
