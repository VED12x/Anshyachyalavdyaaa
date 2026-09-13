import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/connection';
import { config } from '../config';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validation/schemas';
import { denylistToken, isTokenDenylisted } from '../services/redis';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/register
 * Create a new user account.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { email, password, name, role, diabetes_type } = parsed.data;

    // Check if email already exists
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, config.bcryptRounds);

    // Create user
    const [user] = await db('users')
      .insert({
        email,
        password_hash,
        name,
        role,
        diabetes_type: diabetes_type || null,
      })
      .returning(['id', 'email', 'name', 'role', 'diabetes_type', 'created_at']);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        diabetes_type: user.diabetes_type,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Authenticate and receive access + refresh tokens.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { email, password } = parsed.data;

    // Find user
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const tokenPayload = { id: user.id, role: user.role, email: user.email };

    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(tokenPayload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiry,
    } as jwt.SignOptions);

    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        diabetes_type: user.diabetes_type,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh
 * Issue a new access token using a valid refresh token.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
    }

    const { refresh_token } = parsed.data;

    // Check denylist
    const denied = await isTokenDenylisted(refresh_token);
    if (denied) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, config.jwtRefreshSecret) as {
      id: string;
      role: string;
      email: string;
    };

    // Issue new access token
    const tokenPayload = { id: decoded.id, role: decoded.role, email: decoded.email };
    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
    } as jwt.SignOptions);

    // Issue new refresh token and denylist the old one
    const newRefreshToken = jwt.sign(tokenPayload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiry,
    } as jwt.SignOptions);

    await denylistToken(refresh_token);

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * Invalidate the refresh token by adding it to the Redis denylist.
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      await denylistToken(refresh_token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
