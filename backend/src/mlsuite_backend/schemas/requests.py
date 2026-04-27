from typing import NotRequired, TypedDict


class TraceConditionPayload(TypedDict):
    operator: str
    value: NotRequired[object]


class TracePayload(TypedDict):
    text: str
    feature: str
    targetClass: NotRequired[object]
    conditions: NotRequired[list[TraceConditionPayload]]
