/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

export const cx = (...values: Array<string | false | null | undefined>): string =>
	values.filter(Boolean).join(" ");

export function AppPage({
	children,
	className,
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cx("flex size-full overflow-hidden", className)}>
			<div className="flex min-h-0 flex-1">{children}</div>
		</div>
	);
}

export function AppSurface({
	children,
	className,
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx(
				"min-h-0 bg-[var(--surface-primary)] p-6 text-[var(--text-primary)]",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function AppPanel({
	children,
	className,
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx(
				"rounded-[24px] border p-5",
				"border-[var(--border-soft)] bg-[var(--surface-secondary)] text-[var(--text-primary)]",
				"shadow-[var(--shadow-card)]",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function AppEyebrow({
	children,
	className,
}: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cx(
				"text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]",
				className,
			)}
		>
			{children}
		</p>
	);
}

export function AppTitle({
	children,
	className,
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h1
			className={cx(
				"font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-5xl",
				className,
			)}
		>
			{children}
		</h1>
	);
}

export function AppSectionTitle({
	children,
	className,
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h2
			className={cx(
				"text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
				className,
			)}
		>
			{children}
		</h2>
	);
}

export function AppCopy({
	children,
	className,
}: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={cx("text-sm leading-7 text-[var(--text-secondary)]", className)}>
			{children}
		</p>
	);
}

export function AppPageHeader({
	eyebrow,
	title,
	description,
	backHref,
	backLabel = "Back",
	aside,
	className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	backHref?: string;
	backLabel?: string;
	aside?: ReactNode;
}) {
	return (
		<div className={cx("flex flex-wrap items-start justify-between gap-6", className)}>
			<div className="max-w-3xl space-y-3">
				{backHref ? (
					<Link
						to={backHref}
						className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
					>
						<ArrowLeft size={16} />
						{backLabel}
					</Link>
				) : null}
				{eyebrow ? <AppEyebrow>{eyebrow}</AppEyebrow> : null}
				<AppTitle>{title}</AppTitle>
				{description ? <AppCopy className="max-w-2xl">{description}</AppCopy> : null}
			</div>
			{aside ? <div className="flex flex-wrap items-center gap-3">{aside}</div> : null}
		</div>
	);
}

export function AppToolbar({
	children,
	className,
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cx(
				"flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-4 shadow-[var(--shadow-card)]",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function AppBreadcrumbs({
	items,
	className,
}: HTMLAttributes<HTMLElement> & {
	items: Array<{ label: ReactNode; to?: string }>;
}) {
	return (
		<nav className={cx("flex flex-wrap items-center gap-2 text-sm", className)} aria-label="Breadcrumb">
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				return (
					<div key={`${index}-${String(item.label)}`} className="inline-flex items-center gap-2">
						{item.to && !isLast ? (
							<Link
								to={item.to}
								className="font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
							>
								{item.label}
							</Link>
						) : (
							<span className={isLast ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
								{item.label}
							</span>
						)}
						{!isLast ? <ChevronRight size={14} className="text-[var(--text-muted)]" /> : null}
					</div>
				);
			})}
		</nav>
	);
}

export function AppTabs<TValue extends string>({
	items,
	value,
	onChange,
	className,
}: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
	items: Array<{ label: ReactNode; value: TValue }>;
	value: TValue;
	onChange: (value: TValue) => void;
}) {
	return (
		<div
			className={cx(
				"inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-1 shadow-[var(--shadow-card)]",
				className,
			)}
			role="tablist"
		>
			{items.map((item) => {
				const active = item.value === value;
				return (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(item.value)}
						className={cx(
							"rounded-full px-4 py-2.5 text-sm font-medium transition",
							active
								? "bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-[var(--shadow-card)]"
								: "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]",
						)}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}

export function AppEmptyState({
	title,
	description,
	action,
	className,
}: HTMLAttributes<HTMLDivElement> & {
	title: ReactNode;
	description: ReactNode;
	action?: ReactNode;
}) {
	return (
		<AppPanel
			className={cx(
				"flex min-h-[260px] flex-col items-center justify-center gap-4 border-dashed px-6 py-12 text-center",
				className,
			)}
		>
			<AppSectionTitle className="text-2xl">{title}</AppSectionTitle>
			<AppCopy className="max-w-xl">{description}</AppCopy>
			{action ? <div className="pt-2">{action}</div> : null}
		</AppPanel>
	);
}

export function AppBadge({
	children,
	tone = "neutral",
	className,
}: HTMLAttributes<HTMLSpanElement> & {
	tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
	const tones = {
		neutral: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
		accent: "border-transparent bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
		success: "border-transparent bg-[var(--success-quiet)] text-[var(--success-text)]",
		warning: "border-transparent bg-[var(--warning-quiet)] text-[var(--warning-text)]",
		danger: "border-transparent bg-[var(--danger-quiet)] text-[var(--danger-text)]",
	};

	return (
		<span
			className={cx(
				"inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
				tones[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}

export function AppButton({
	children,
	variant = "primary",
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
	const variants = {
		primary:
			"bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-strong)]",
		secondary:
			"border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
		ghost:
			"bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
		danger:
			"bg-[var(--surface-primary)] text-[var(--danger-text)] border border-transparent hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)]",
	};

	return (
		<button
			{...props}
			className={cx(
				"inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
				variants[variant],
				className,
			)}
		>
			{children}
		</button>
	);
}

export function AppIconButton({
	children,
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={cx(
				"inline-flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45",
				className,
			)}
		>
			{children}
		</button>
	);
}

export function AppTextField({
	className,
	prefix,
	...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
	prefix?: ReactNode;
}) {
	return (
		<label
			className={cx(
				"inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]",
				className,
			)}
		>
			{prefix}
			<input
				{...props}
				className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
			/>
		</label>
	);
}

export function AppSelect({
	className,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className={cx(
				"rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] outline-none",
				className,
			)}
		>
			{children}
		</select>
	);
}
