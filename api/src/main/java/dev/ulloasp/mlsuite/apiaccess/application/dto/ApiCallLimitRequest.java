package dev.ulloasp.mlsuite.apiaccess.application.dto;

import jakarta.annotation.Nullable;

/** An organization's own monthly call limit, or null to follow the instance default. */
public record ApiCallLimitRequest(@Nullable Integer monthlyCalls) {
}
