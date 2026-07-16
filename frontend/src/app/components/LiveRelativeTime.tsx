/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useState } from "react";
import { formatCompactRelativeTime } from "../../algorithms/catalog/relative-time";

type LiveRelativeTimeProps = {
  value?: string;
};

export function LiveRelativeTime({ value }: LiveRelativeTimeProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <>{formatCompactRelativeTime(value, now)}</>;
}
