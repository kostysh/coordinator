import { GenericMessage } from './messages';

// Request type
export interface Request<RequestQuery extends GenericMessage> {
  query: RequestQuery; // Industry specific query type
}
