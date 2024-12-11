import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(import.meta.env.JWT_SECRET);

export default eventHandler(() =>
	new SignJWT({ userId: 'test' })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setIssuer('wevis:politigraph')
		.setExpirationTime('2h')
		.sign(secret),
);
