export interface GenericMessage {
  id: string;
  expire: number;
  nonce?: number;
  [key: string]: unknown;
}
