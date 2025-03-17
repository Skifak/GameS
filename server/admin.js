/**
 * Модуль для реализации API администрирования карты.
 * Предоставляет эндпоинты для управления гексами и точками интереса.
 * @module admin
 */

import express from 'express';
import { supabase } from './index.js';
import logger from './logger.js';

const router = express.Router();

/**
 * Middleware для проверки роли администратора.
 * @param {import('express').Request} req - Входящий запрос
 * @param {import('express').Response} res - Ответ сервера
 * @param {import('express').NextFunction} next - Следующая функция в цепочке
 */
const adminMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        logger.warn('No token provided in admin request');
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) throw new Error('Invalid token');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profileError) throw new Error(profileError.message);
        if (profile.role !== 'admin') throw new Error('User is not an admin');

        req.user = user;
        next();
    } catch (error) {
        logger.error('Admin access error:', error.message);
        res.status(403).json({ error: 'Access denied: ' + error.message });
    }
};

// Применяем middleware ко всем маршрутам
router.use(adminMiddleware);

/**
 * Обновляет тип гекса.
 * @route PUT /admin/update-hex
 * @param {Object} req.body - Данные запроса
 * @param {number} req.body.q - Координата q гекса
 * @param {number} req.body.r - Координата r гекса
 * @param {string} req.body.type - Новый тип гекса
 * @returns {Object} Результат операции
 */
router.put('/update-hex', async (req, res) => {
    const { q, r, type } = req.body;
    if (!q || !r || !type) {
        return res.status(400).json({ error: 'Missing q, r, or type' });
    }

    try {
        const { data, error } = await supabase
            .from('hexes')
            .update({ type, updated_at: new Date().toISOString() })
            .eq('q', q)
            .eq('r', r)
            .select()
            .single();

        if (error) throw new Error(error.message);
        logger.info(`Hex (${q}, ${r}) updated to type ${type} by admin ${req.user.id}`);
        res.json({ success: true, hex: data });
    } catch (error) {
        logger.error('Failed to update hex:', error.message);
        res.status(500).json({ error: 'Failed to update hex: ' + error.message });
    }
});

/**
 * Создает новую точку интереса.
 * @route POST /admin/create-point
 * @param {Object} req.body - Данные запроса
 * @param {number} req.body.hex_q - Координата q гекса
 * @param {number} req.body.hex_r - Координата r гекса
 * @param {string} req.body.type - Тип точки
 * @param {number} req.body.x - Координата X
 * @param {number} req.body.y - Координата Y
 * @returns {Object} Результат операции
 */
router.post('/create-point', async (req, res) => {
    const { hex_q, hex_r, type, x, y } = req.body;
    if (!hex_q || !hex_r || !type || x === undefined || y === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await supabase
            .from('points_of_interest')
            .insert({ hex_q, hex_r, type, x, y, updated_at: new Date().toISOString() })
            .select()
            .single();

        if (error) throw new Error(error.message);
        logger.info(`Point created at (${hex_q}, ${hex_r}) with type ${type} by admin ${req.user.id}`);
        res.json({ success: true, point: data });
    } catch (error) {
        logger.error('Failed to create point:', error.message);
        res.status(500).json({ error: 'Failed to create point: ' + error.message });
    }
});

/**
 * Обновляет существующую точку интереса.
 * @route PUT /admin/update-point
 * @param {Object} req.body - Данные запроса
 * @param {number} req.body.id - ID точки
 * @param {string} [req.body.type] - Новый тип точки (опционально)
 * @param {number} [req.body.x] - Новая координата X (опционально)
 * @param {number} [req.body.y] - Новая координата Y (опционально)
 * @returns {Object} Результат операции
 */
router.put('/update-point', async (req, res) => {
    const { id, type, x, y } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Missing point ID' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (type) updates.type = type;
    if (x !== undefined) updates.x = x;
    if (y !== undefined) updates.y = y;

    try {
        const { data, error } = await supabase
            .from('points_of_interest')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        logger.info(`Point ${id} updated by admin ${req.user.id}`);
        res.json({ success: true, point: data });
    } catch (error) {
        logger.error('Failed to update point:', error.message);
        res.status(500).json({ error: 'Failed to update point: ' + error.message });
    }
});

/**
 * Создает связь между переходными точками.
 * @route POST /admin/create-transition
 * @param {Object} req.body - Данные запроса
 * @param {number} req.body.from_point_id - ID исходной точки
 * @param {number} req.body.to_point_id - ID целевой точки
 * @returns {Object} Результат операции
 */
router.post('/create-transition', async (req, res) => {
    const { from_point_id, to_point_id } = req.body;
    if (!from_point_id || !to_point_id) {
        return res.status(400).json({ error: 'Missing from_point_id or to_point_id' });
    }

    try {
        const { data, error } = await supabase
            .from('point_transitions')
            .insert({ from_point_id, to_point_id })
            .select()
            .single();

        if (error) throw new Error(error.message);
        logger.info(`Transition created from ${from_point_id} to ${to_point_id} by admin ${req.user.id}`);
        res.json({ success: true, transition: data });
    } catch (error) {
        logger.error('Failed to create transition:', error.message);
        res.status(500).json({ error: 'Failed to create transition: ' + error.message });
    }
});

export default router;