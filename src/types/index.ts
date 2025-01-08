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
    output: string;
    aiModel: string;
    temperature: number;
    preserveStructure: boolean;
    namingConvention: string;
}
