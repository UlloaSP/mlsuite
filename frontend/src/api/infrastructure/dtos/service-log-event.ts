/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/


export type ServiceLogEvent = {
  type: "service.log.line";
  serviceName: string;
  line: string;
};
