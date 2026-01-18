/// <reference types="vite/client" />

declare module '*?worker' {
    const workerConstructor: {
        new(): Worker;
    };
    export default workerConstructor;
}

interface ImportMetaEnv {
    readonly VITE_TELEMETRYDECK_APP_ID: string;
    readonly VITE_TELEMETRYDECK_TEST_MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}