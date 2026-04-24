import re

INTEGER_PATTERN = re.compile(r"^[+-]?\d+$")
FLOAT_PATTERN = re.compile(r"^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$")


def coerce_scalar(value: object) -> object:
    if not isinstance(value, str):
        return value

    stripped = value.strip()
    if stripped == "":
        return value

    lowered = stripped.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if INTEGER_PATTERN.fullmatch(stripped):
        try:
            return int(stripped)
        except ValueError:
            return value
    if FLOAT_PATTERN.fullmatch(stripped):
        try:
            return float(stripped)
        except ValueError:
            return value
    return value


def coerce_record_values(record: dict[str, object]) -> dict[str, object]:
    return {key: coerce_scalar(value) for key, value in record.items()}
