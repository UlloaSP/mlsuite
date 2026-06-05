/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "../../app/components/ui-controls";
import { getPredictionStatusLabel, getPredictionStatusTone } from "../utils";

type PredictionStatusPillProps = {
  status: unknown;
};

export function PredictionStatusPill({ status }: PredictionStatusPillProps) {
  return (
    <AppBadge tone={getPredictionStatusTone(status)}>{getPredictionStatusLabel(status)}</AppBadge>
  );
}
