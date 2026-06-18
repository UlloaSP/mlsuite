/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export interface RoleTemplateDto {
  id: number;
  name: string;
  description: string;
  category: string;
  scope: string;
  permissionKeys: string[];
}
