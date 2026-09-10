import { useMemo, useState } from "react";
import { groupReviewCandidates, type ReviewCandidate } from "./review-creation-api";

export function useReviewRunSelection(candidates: ReviewCandidate[]) {
  const groups = useMemo(() => groupReviewCandidates(candidates), [candidates]);
  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const group = groups.find((item) => item.key === groupKey) ?? groups[0];
  const [bookmark, setBookmark] = useState("all");
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(
    () => new Set(group?.candidates.map((item) => item.runId)),
  );
  const bookmarkOptions = Array.from(
    new Map(
      (group?.candidates ?? [])
        .filter((item) => item.bookmarkId !== undefined)
        .map((item) => [
          item.bookmarkId ?? "none",
          {
            value: item.bookmarkId ?? "none",
            label:
              item.bookmarkName ??
              (item.bookmarkId ? `Bookmark ${item.bookmarkId}` : "No bookmark"),
          },
        ]),
    ).values(),
  );
  const runCandidates = (group?.candidates ?? []).filter(
    (item) => bookmark === "all" || (item.bookmarkId ?? "none") === bookmark,
  );
  const selectGroup = (key: string) => {
    const next = groups.find((item) => item.key === key);
    setGroupKey(key);
    setBookmark("all");
    setSelectedRunIds(new Set(next?.candidates.map((item) => item.runId)));
  };
  const selectBookmark = (value: string) => {
    setBookmark(value);
    setSelectedRunIds(
      new Set(
        (group?.candidates ?? [])
          .filter((item) => value === "all" || (item.bookmarkId ?? "none") === value)
          .map((item) => item.runId),
      ),
    );
  };
  return {
    groups,
    group,
    bookmark,
    bookmarkOptions,
    runCandidates,
    selectedRunIds,
    setSelectedRunIds,
    selectGroup,
    selectBookmark,
  };
}
