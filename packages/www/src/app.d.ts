import type { PublicSettingsData } from "@worker-blog/shared/public-api";

declare global {
  namespace App {
    interface Locals {
      settings?: PublicSettingsData;
    }
  }
}

export {};
