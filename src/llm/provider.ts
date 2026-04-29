import type { CardDraft, LinkMetadata, RawMessageInput } from "../domain/types.js";

export type CardGenerationInput = {
  message: RawMessageInput;
  cleanedText: string;
  links: LinkMetadata[];
};

export interface LlmProvider {
  generateCard(input: CardGenerationInput): Promise<CardDraft>;
}
