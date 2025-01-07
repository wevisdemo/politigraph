import { auth } from '~/utils/auth';

export default defineEventHandler((event) => auth.handler(toWebRequest(event)));
