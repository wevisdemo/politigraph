import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export default eventHandler(() =>
	new SignJWT({ userId: 'test' })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setIssuer('politigraph.wevis.info')
		.setExpirationTime('2h')
		.sign(secret),
);
