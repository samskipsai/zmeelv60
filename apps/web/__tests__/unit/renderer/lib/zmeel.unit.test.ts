/**
 * Unit tests for Zmeel API library
 *
 * Tests the Electron detection and shell utilities:
 * - isRunningInElectron() detection
 * - getShellVersion() retrieval
 * - getShellPlatform() retrieval
 * - getZmeel() and useZmeel() API access
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original window
const originalWindow = globalThis.window;

describe('Zmeel API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    (globalThis as unknown as { window: Record<string, unknown> }).window = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { window: typeof window }).window = originalWindow;
  });

  describe('isRunningInElectron', () => {
    it('should return true when zmeelShell.isElectron is true', async () => {
      (globalThis as unknown as { window: { zmeelShell: { isElectron: boolean } } }).window = {
        zmeelShell: { isElectron: true },
      };

      const { isRunningInElectron } = await import('@/lib/zmeel');
      expect(isRunningInElectron()).toBe(true);
    });

    it('should return false when zmeelShell.isElectron is false', async () => {
      (globalThis as unknown as { window: { zmeelShell: { isElectron: boolean } } }).window = {
        zmeelShell: { isElectron: false },
      };

      const { isRunningInElectron } = await import('@/lib/zmeel');
      expect(isRunningInElectron()).toBe(false);
    });

    it('should return false when zmeelShell is unavailable', async () => {
      // Test undefined, null, missing property, and empty object
      const unavailableScenarios = [
        { zmeelShell: undefined },
        { zmeelShell: null },
        { zmeelShell: { version: '1.0.0' } }, // missing isElectron
        {}, // no zmeelShell at all
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { isRunningInElectron } = await import('@/lib/zmeel');
        expect(isRunningInElectron()).toBe(false);
      }
    });

    it('should use strict equality for isElectron check', async () => {
      // Truthy but not true should return false
      (globalThis as unknown as { window: { zmeelShell: { isElectron: number } } }).window = {
        zmeelShell: { isElectron: 1 },
      };

      const { isRunningInElectron } = await import('@/lib/zmeel');
      expect(isRunningInElectron()).toBe(false);
    });
  });

  describe('getShellVersion', () => {
    it('should return version when available', async () => {
      (globalThis as unknown as { window: { zmeelShell: { version: string } } }).window = {
        zmeelShell: { version: '1.2.3' },
      };

      const { getShellVersion } = await import('@/lib/zmeel');
      expect(getShellVersion()).toBe('1.2.3');
    });

    it('should return null when version is unavailable', async () => {
      const unavailableScenarios = [
        { zmeelShell: undefined },
        { zmeelShell: { isElectron: true } }, // no version property
        {},
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getShellVersion } = await import('@/lib/zmeel');
        expect(getShellVersion()).toBeNull();
      }
    });

    it('should handle various version formats', async () => {
      const versions = ['0.0.1', '1.0.0', '2.5.10', '1.0.0-beta.1', '1.0.0-rc.2'];

      for (const version of versions) {
        vi.resetModules();
        (globalThis as unknown as { window: { zmeelShell: { version: string } } }).window = {
          zmeelShell: { version },
        };
        const { getShellVersion } = await import('@/lib/zmeel');
        expect(getShellVersion()).toBe(version);
      }
    });
  });

  describe('getShellPlatform', () => {
    it('should return platform when available', async () => {
      const platforms = ['darwin', 'linux', 'win32'];

      for (const platform of platforms) {
        vi.resetModules();
        (globalThis as unknown as { window: { zmeelShell: { platform: string } } }).window = {
          zmeelShell: { platform },
        };
        const { getShellPlatform } = await import('@/lib/zmeel');
        expect(getShellPlatform()).toBe(platform);
      }
    });

    it('should return null when platform is unavailable', async () => {
      const unavailableScenarios = [
        { zmeelShell: undefined },
        { zmeelShell: { isElectron: true } }, // no platform property
        {},
      ];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getShellPlatform } = await import('@/lib/zmeel');
        expect(getShellPlatform()).toBeNull();
      }
    });
  });

  describe('getZmeel', () => {
    it('should return zmeel API when available', async () => {
      const mockApi = {
        getVersion: vi.fn(),
        startTask: vi.fn(),
        validateBedrockCredentials: vi.fn(),
        saveBedrockCredentials: vi.fn(),
        getBedrockCredentials: vi.fn(),
      };
      (globalThis as unknown as { window: { zmeel: typeof mockApi } }).window = {
        zmeel: mockApi,
      };

      const { getZmeel } = await import('@/lib/zmeel');
      const result = getZmeel();
      // getZmeel returns a wrapper object with spread methods + Bedrock wrappers
      expect(result.getVersion).toBeDefined();
      expect(result.startTask).toBeDefined();
      expect(result.validateBedrockCredentials).toBeDefined();
      expect(result.saveBedrockCredentials).toBeDefined();
      expect(result.getBedrockCredentials).toBeDefined();
    });

    it('should throw when zmeel API is not available', async () => {
      const unavailableScenarios = [{ zmeel: undefined }, {}];

      for (const scenario of unavailableScenarios) {
        vi.resetModules();
        (globalThis as unknown as { window: Record<string, unknown> }).window = scenario;
        const { getZmeel } = await import('@/lib/zmeel');
        expect(() => getZmeel()).toThrow(
          'Zmeel API not available - not running in Electron',
        );
      }
    });
  });

  describe('useZmeel', () => {
    it('should return zmeel API when available', async () => {
      const mockApi = { getVersion: vi.fn(), startTask: vi.fn() };
      (globalThis as unknown as { window: { zmeel: typeof mockApi } }).window = {
        zmeel: mockApi,
      };

      const { useZmeel } = await import('@/lib/zmeel');
      expect(useZmeel()).toBe(mockApi);
    });

    it('should throw when zmeel API is not available', async () => {
      (globalThis as unknown as { window: { zmeel?: unknown } }).window = {
        zmeel: undefined,
      };

      const { useZmeel } = await import('@/lib/zmeel');
      expect(() => useZmeel()).toThrow(
        'Zmeel API not available - not running in Electron',
      );
    });
  });

  describe('Complete Shell Object', () => {
    it('should recognize complete shell object with all properties', async () => {
      const completeShell = {
        version: '1.0.0',
        platform: 'darwin',
        isElectron: true as const,
      };
      (globalThis as unknown as { window: { zmeelShell: typeof completeShell } }).window = {
        zmeelShell: completeShell,
      };

      const { isRunningInElectron, getShellVersion, getShellPlatform } =
        await import('@/lib/zmeel');

      expect(isRunningInElectron()).toBe(true);
      expect(getShellVersion()).toBe('1.0.0');
      expect(getShellPlatform()).toBe('darwin');
    });

    it('should handle partial shell object gracefully', async () => {
      const partialShell = { version: '1.0.0', isElectron: true as const };
      (globalThis as unknown as { window: { zmeelShell: typeof partialShell } }).window = {
        zmeelShell: partialShell,
      };

      const { isRunningInElectron, getShellVersion, getShellPlatform } =
        await import('@/lib/zmeel');

      expect(isRunningInElectron()).toBe(true);
      expect(getShellVersion()).toBe('1.0.0');
      expect(getShellPlatform()).toBeNull();
    });
  });
});
