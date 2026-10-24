/// <reference types="vite/client" />
interface Mermaid { initialize(config: Record<string,unknown>): void; render(id:string,source:string):Promise<{svg:string}> }
interface Window { mermaid: Mermaid }
