import { GenericMessage } from './messages';
import { Request } from './requests';

export type GenericOptions = Record<string, unknown>;

export interface PaymentOption {
  price: string;
  asset: string; // ERC20 contract address
}

export interface RefundOption {
  time: number; // Seconds before checkIn
  penalty: number; // percents of total
}

export interface UnsignedOffer extends GenericMessage {
  supplierId: string; // Unique supplier Id registered on the protocol contract
  requestHash: string; // <keccak256(JSON.stringify(sorted_request))>
  optionsHash: string; // <keccak256(JSON.stringify(sorted_options))>
  paymentHash: string; // <keccak256(JSON.stringify(sorted_payment))>
  refundHash: string; // <keccak256(JSON.stringify(sorted_refund(by time DESC) || []))>
  transferable: boolean; // option makes the deal NFT transferable or not
  checkIn: number; // check-in time in seconds
}

export interface SignedOffer extends UnsignedOffer {
  signature: string; // TypedSignature(UnsignedOffer)
}

export interface Offer<RequestQuery extends GenericMessage, OfferOptions extends GenericOptions> {
  request: Request<RequestQuery>;
  chainId: number;
  options: OfferOptions; // Supplier-specific offer options
  payment: PaymentOption[];
  refund?: RefundOption[];
  payload: SignedOffer;
}
