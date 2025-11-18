import jwt from "jsonwebtoken";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 15; // 15 jours

function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("[sessionToken] JWT_SECRET manquant");
    }
    return secret;
}

export function createSessionToken(payload) {
    const secret = getSecret();
    return jwt.sign(payload, secret, { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token) {
    try {
        const secret = getSecret();
        return jwt.verify(token, secret);
    } catch {
        return null;
    }
}

export { SESSION_MAX_AGE_SECONDS };


