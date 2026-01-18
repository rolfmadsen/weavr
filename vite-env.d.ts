/// <reference types="vite/client" />

declare module '*?worker' {
    const workerConstructor: {
        new(): Worker;
    };
    export default workerConstructor;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}