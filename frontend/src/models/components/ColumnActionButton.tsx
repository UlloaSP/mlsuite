/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { BadgePlus } from "lucide-react";
import { AppButton } from "../../app/components";

type ColumnActionButtonProps = {
	onClick: () => void | Promise<void>;
};

export function ColumnActionButton({ onClick }: ColumnActionButtonProps) {
	return (
		<AppButton
			type="button"
			onClick={onClick}
			variant="primary"
			className="w-full"
		>
			<BadgePlus size={28} fontWeight={30} />
			New
		</AppButton>
	);
}
