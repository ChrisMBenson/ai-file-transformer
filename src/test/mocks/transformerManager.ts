import { TransformerConfig } from '../../types';

export class MockTransformerManager {
  private transformers: Map<string, TransformerConfig> = new Map();

  async addTransformer(transformer: TransformerConfig): Promise<void> {
    this.transformers.set(transformer.id, transformer);
  }

  async getTransformer(id: string): Promise<TransformerConfig | undefined> {
    return this.transformers.get(id);
  }

  async editTransformer(id: string, updates: Partial<TransformerConfig>): Promise<void> {
    const transformer = this.transformers.get(id);
    if (transformer) {
      this.transformers.set(id, { ...transformer, ...updates });
    }
  }

  async deleteTransformer(id: string): Promise<void> {
    this.transformers.delete(id);
  }

  async duplicateTransformer(id: string): Promise<string> {
    const original = this.transformers.get(id);
    if (!original) {
      throw new Error('Transformer not found');
    }
    
    const newId = `${id}-copy`;
    const duplicate = { 
      ...original,
      id: newId,
      name: `${original.name} (Copy)`
    };
    
    this.transformers.set(newId, duplicate);
    return newId;
  }

  async listTransformers(): Promise<TransformerConfig[]> {
    return Array.from(this.transformers.values());
  }
}
