/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppFileDropZone } from "@/shared/ui/AppFileDropZone";
import { ALL_EXTS, DF_EXT_LABEL, MODEL_EXT_LABEL } from "@/features/models/lib/bundle-utils";

type Props = {
  onFiles: (files: File[]) => void | Promise<void>;
};

export function BundleDropZone({ onFiles }: Props) {
  return (
    <AppFileDropZone
      accept={ALL_EXTS.join(",")}
      hints={[`models: ${MODEL_EXT_LABEL}`, `dataframes: ${DF_EXT_LABEL}`]}
      inputLabel="Upload bundle files"
      onFiles={onFiles}
    />
  );
}
