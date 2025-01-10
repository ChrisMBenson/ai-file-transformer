// src/types/index.ts

interface Input {
    name: string;
    description: string;
    type: string;
    value: string;
    required: boolean;
}

export interface TransformerConfig {
    id: string;
    name: string;
    description: string;
    prompt: string;
    input: Input[];
    outputFolder: string;
    outputFileName: string | null;
    outputFileExtension: string | null;
    temperature: number;
    maxTokens: number;
    preserveStructure: boolean;
    processFormat: 'eachFile' | 'joinFiles';
}
