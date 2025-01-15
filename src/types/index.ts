// src/types/index.ts

export interface Input {
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
    temperature: number;
    processFormat: 'eachFile' | 'joinFiles';
}

export interface ProgressEvent {
    type: 'execution' | 'editMode';
    subType: 'currentInput' | 'progress' | 'outputCreated';
    filePath?: string;
    outputUri?: string;
    message?: string;
}
