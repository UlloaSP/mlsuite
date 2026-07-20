/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { EditorBody } from "./EditorBody";
import { EditorFooter } from "./EditorFooter";

type Props = {
  diffBaseText?: string;
};

export function EditorWrapper({ diffBaseText }: Props) {
  return (
    <motion.div className="flex flex-col flex-1 min-h-0">
      <motion.div className="flex-1 min-h-0">
        <EditorBody diffBaseText={diffBaseText} />
      </motion.div>
      <EditorFooter />
    </motion.div>
  );
}
