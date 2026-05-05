import type { ToolSupportStatus } from '@zmeel/agent-core';

export interface OllamaModel {
  id: string;
  name: string;
  toolSupport?: ToolSupportStatus;
}
