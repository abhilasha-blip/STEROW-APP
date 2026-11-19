import { setupServer } from 'msw/node';
import { handlers, requestLog } from './handlers';

export const server = setupServer(...handlers);
export { requestLog };
