/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppFileDropZone } from "@/shared/ui/AppFileDropZone";
import { BUNDLE_EXT } from "@/features/models/lib/bundle-utils";

type Props = {
  onFiles: (files: File[]) => void | Promise<void>;
};

export function BundleDropZone({ onFiles }: Props) {
  return (
    <AppFileDropZone
      accept={BUNDLE_EXT}
      hints={[`models: ${BUNDLE_EXT}`]}
      inputLabel="Upload bundle files"
      onFiles={onFiles}
    />
  );
}
