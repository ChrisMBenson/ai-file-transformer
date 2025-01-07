// src/types/index.ts
interface Placeholder {
    name: string;
    description: string;
    required: boolean;
    default: string;
}

interface Prompt {
    name: string;
    placeholders: Placeholder[];
}

interface Config {
    name: string;
    type: string; // e.g., "checkbox"
    required: boolean;
    default: boolean;
}

interface Input {
    name: string;
    description: string;
    required: boolean;
}

interface AiConfig {
    temperature: string;
    value: string;
}

export interface TransformerConfig {
    id: string;
    name: string;
    description: string;
    prompt: string;
    input: Input[];
    output: string[];
    configs: Config[];
    prompts: Prompt[];
    aiConfigs: AiConfig[];
}
