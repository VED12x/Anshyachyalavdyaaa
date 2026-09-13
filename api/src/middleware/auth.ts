import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Augment Express Request with user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'patient' | 'caregiver' | 'clinician';
        email: string;
      };
    }
  }
}

/**
 * Middleware that verifies the JWT access token from the Authorization header
 * and attaches the decoded user payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      role: 'patient' | 'caregiver' | 'clinician';
      email: string;
    };

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware factory that restricts access to users with specific roles.
 * Must be used after authenticate middleware.
 *
 * @example
 * router.get('/admin', authenticate, requireRole(['clinician']), handler);
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
