//middleware/authorize.js
import jwt from 'jsonwebtoken';

export default function authorize(...allowedRoles) {
    return (req, res, next) => {
        try {
            // Extract token from 'Authorization: Bearer <token>' header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Access Denied: No Token Provided' });
            }

            const token = authHeader.split(' ')[1];
            
            // Verify token validity against our environmental secret
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attach user payload (id, username, role) to the request object

            // Evaluate Role clearance matches requirements
            if (allowedRoles.length && !allowedRoles.includes(req.user.user_role)) {
                return res.status(403).json({ error: 'Forbidden: Insufficient Security Permissions' });
            }

            next(); // Access granted, proceed to the controller
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or Expired Security Token' });
        }
    };
}
