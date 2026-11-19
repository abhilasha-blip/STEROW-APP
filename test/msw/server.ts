import { setupServer } from 'msw/node';
import { handlers, requestLog, resetHandlerState } from './handlers';

export const server = setupServer(...handlers);
export { requestLog, resetHandlerState };
