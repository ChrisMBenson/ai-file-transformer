// src/types/index.ts
export interface TransformerConfig {
    id: string;
    name: string;
    description: string;
    inputFiles: string;
    aiModel: string;
    temperature: number;
    prompt: string;
    outputFolder: string;
    preserveStructure: boolean;
    namingConvention: string;
}
