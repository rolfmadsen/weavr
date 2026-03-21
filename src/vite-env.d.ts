/// <reference types="vite/client" />

import type { IStaticMethods } from "preline/dist";

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

declare module 'preline' {
  const content: any;
  export default content;
}

declare module "*.json" {
  const value: any;
  export default value;
}