import * as _jwt from 'jsonwebtoken';

const jwt = _jwt.default || _jwt;

export function getUserFromRequest(request) {
    try {
        // Retrieve the session token from the request cookies
        const token = request.cookies.get('token')?.value;

        if (!token) {
            console.log('[auth] No token cookie found');
            return null;
        }

        // Verify the JWT signature using the environment's secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stepwise_jwt_secret_key_1234');

        // Normalize the user ID field across different potential token schemas
        const uid = decoded.userId || decoded['userId'] || decoded.id;
        if (uid) {
            decoded.id = uid;
            decoded.userId = uid;
            decoded.userId = uid;
        }

        return decoded;
    } catch (error) {
        console.error('[auth] JWT verify failed:', error.message);
        return null;
    }
}
