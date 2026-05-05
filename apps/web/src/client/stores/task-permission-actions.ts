import type { PermissionRequest, PermissionResponse } from '@zmeel/agent-core/common';
import { getZmeel } from '../lib/zmeel';
import type { TaskState } from './taskStore';
import { hasTaskStateToken } from './task-state-helpers';

type SetFn = (partial: Partial<TaskState> | ((state: TaskState) => Partial<TaskState>)) => void;
type GetFn = () => TaskState;

/** Permission request/response slice of the task store. */
export function createTaskPermissionActions(set: SetFn, get: GetFn) {
  return {
    setPermissionRequest: (request: PermissionRequest) => {
      set((state) => ({
        permissionRequests: { ...state.permissionRequests, [request.taskId]: request },
      }));
    },

    clearPermissionRequest: (taskId: string) => {
      set((state) => {
        const { [taskId]: _, ...rest } = state.permissionRequests;
        return { permissionRequests: rest };
      });
    },

    respondToPermission: async (response: PermissionResponse) => {
      const zmeel = getZmeel();
      const taskStateToken = get()._taskStateToken;
      // Save the requestId before the await to detect if a newer request arrived
      const requestId = response.requestId;
      void zmeel.logEvent({
        level: 'info',
        message: 'UI permission response',
        context: { ...response },
      });
      await zmeel.respondToPermission(response);
      if (!hasTaskStateToken(get(), taskStateToken)) {
        return;
      }
      set((state) => {
        const existingRequest = state.permissionRequests[response.taskId];
        // Only clear if the stored request still matches the one we responded to
        if (!existingRequest || existingRequest.id !== requestId) {
          return state;
        }
        const { [response.taskId]: _, ...rest } = state.permissionRequests;
        return { permissionRequests: rest };
      });
    },
  };
}
