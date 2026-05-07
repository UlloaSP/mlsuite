export function formatPercent(value: number | null | undefined) {
	return value == null ? "n/a" : `${value.toFixed(1)}%`;
}

export function formatBytes(value: number | null | undefined) {
	if (value == null) {
		return "n/a";
	}
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = value;
	let index = 0;
	while (size >= 1024 && index < units.length - 1) {
		size /= 1024;
		index += 1;
	}
	return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatTimestamp(value: string) {
	return new Date(value).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
