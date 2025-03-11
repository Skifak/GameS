import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import logger from "./logger.js";
import config from "./config.js";
import { pool } from './db.js';
import bcrypt from 'bcrypt';

const SUPABASE_URL = config.supabaseUrl;
const SUPABASE_ANON_KEY = config.supabaseAnonKey;
const SUPABASE_SERVICE_KEY = config.supabaseServiceKey;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Вспомогательная функция для работы с Supabase API
async function supabaseRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'apikey': options.useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${options.useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Supabase request failed');
        }

        return data;
    } catch (error) {
        logger.error(`Supabase API error: ${error.message}`);
        throw error;
    }
}

export async function register(req, res) {
    const { username, email, password } = req.body;
    
    logger.info(`Registration request body: ${JSON.stringify(req.body)}`);
    
    if (!username || !email || !password) {
        logger.warn(`Registration failed: Missing fields - username: ${!!username}, email: ${!!email}, password: ${!!password}`);
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Регистрируем пользователя
        const result = await pool.query(
            'SELECT * FROM auth.register($1, $2, $3)',
            [email, hashedPassword, username]
        );
        
        const user = result.rows[0];
        
        // Создаем JWT токен
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                username: username
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info(`User registered successfully: ${email}`);
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: username
            }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        if (error.constraint === 'users_email_key') {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
}

export async function login(req, res) {
    const { email, password } = req.body;
    
    logger.info(`Attempting to login user: ${email}`);
    
    if (!email || !password) {
        logger.warn(`Login failed: Missing required fields`);
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // Получаем пользователя
        const result = await pool.query(
            'SELECT * FROM auth.users WHERE email = $1',
            [email]
        );
        
        const user = result.rows[0];
        
        if (!user) {
            logger.warn(`Login failed: User not found - ${email}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.encrypted_password);
        
        if (!isValidPassword) {
            logger.warn(`Login failed: Invalid password - ${email}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Получаем профиль
        const profileResult = await pool.query(
            'SELECT * FROM public.profiles WHERE id = $1',
            [user.id]
        );
        
        const profile = profileResult.rows[0];
        
        // Создаем JWT токен
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                username: profile.username
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        logger.info(`User logged in successfully: ${email}`);
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: profile.username
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
}

export async function refreshToken(req, res) {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
        return res.status(400).json({ message: "Refresh token is required" });
    }

    try {
        const data = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            body: JSON.stringify({ refresh_token })
        });

        return res.json({
            access_token: data.access_token,
            refresh_token: data.refresh_token
        });
    } catch (error) {
        logger.error(`Token refresh error: ${error.message}`);
        res.status(401).json({ message: "Invalid refresh token" });
    }
}

export async function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error("Invalid token");
    }
}

export async function getUserProfile(req, res) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: "No authorization header" });
    }

    try {
        const token = authHeader.split(' ')[1];
        const userData = await supabaseRequest('/auth/v1/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Получаем дополнительные данные профиля из публичной схемы
        const profileData = await supabaseRequest('/rest/v1/profiles', {
            method: 'GET',
            useServiceKey: true,
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Range': '0-0',
                'Prefer': 'return=representation'
            },
            searchParams: new URLSearchParams({
                id: `eq.${userData.id}`,
                select: '*'
            })
        });

        return res.json({
            user: {
                ...userData,
                profile: profileData[0]
            }
        });
    } catch (error) {
        logger.error(`Get profile error: ${error.message}`);
        res.status(401).json({ message: "Failed to get user profile" });
    }
}

export async function updateProfile(req, res) {
    const authHeader = req.headers.authorization;
    const { name, avatar_url, ...otherData } = req.body;
    
    if (!authHeader) {
        return res.status(401).json({ message: "No authorization header" });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Обновляем метаданные пользователя
        await supabaseRequest('/auth/v1/user', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                data: { name }
            })
        });

        // Обновляем профиль в публичной схеме
        await supabaseRequest('/rest/v1/profiles', {
            method: 'PATCH',
            useServiceKey: true,
            headers: {
                'Prefer': 'return=representation'
            },
            searchParams: new URLSearchParams({
                id: `eq.${decoded.id}`
            }),
            body: JSON.stringify({
                avatar_url,
                ...otherData,
                updated_at: new Date().toISOString()
            })
        });

        return res.json({ message: "Profile updated successfully" });
    } catch (error) {
        logger.error(`Update profile error: ${error.message}`);
        res.status(401).json({ message: "Failed to update profile" });
    }
}