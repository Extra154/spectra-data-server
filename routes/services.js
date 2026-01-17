const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

/* =========================
   Middleware
========================= */
app.use(cors());
app.use(bodyParser.json());

/* =========================
   Database
========================= */
const db = new sqlite3.Database('./service_providers.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to SQLite database.');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS service_providers (
            provider_id TEXT PRIMARY KEY,
            username TEXT,
            business_name TEXT,
            bio TEXT,
            phone TEXT,
            email TEXT,
            location TEXT,
            latitude REAL,
            longitude REAL,
            services_json TEXT,
            price_range TEXT,
            availability_json TEXT,
            rating REAL DEFAULT 0,
            rating_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            completed_jobs INTEGER DEFAULT 0,
            profile_image_path TEXT,
            cover_image_path TEXT,
            is_verified INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER,
            updated_at INTEGER
        )
    `);
});

/* =========================
   HELPERS
========================= */
function serverTime() {
    return Date.now(); // authoritative timestamp
}

/* =========================
   ROUTES
========================= */

/**
 * 🔄 PULL SYNC
 * Get providers updated after a timestamp
 * GET /providers?updated_after=123456
 */
app.get('/providers', (req, res) => {
    const updatedAfter = Number(req.query.updated_after || 0);

    const sql = `
        SELECT * FROM service_providers
        WHERE updated_at > ?
        ORDER BY updated_at ASC
    `;

    db.all(sql, [updatedAfter], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            server_time: serverTime(),
            count: rows.length,
            data: rows
        });
    });
});

/**
 * 🔍 GET SINGLE PROVIDER
 */
app.get('/providers/:id', (req, res) => {
    db.get(
        'SELECT * FROM service_providers WHERE provider_id = ?',
        [req.params.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Not found' });
            res.json(row);
        }
    );
});

/**
 * ⬆️ PUSH SYNC / UPSERT
 * Client sends provider → server decides winner
 */
app.post('/providers/sync', (req, res) => {
    const p = req.body;
    const now = serverTime();

    db.get(
        'SELECT updated_at FROM service_providers WHERE provider_id = ?',
        [p.providerId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            // If server record is newer → reject client overwrite
            if (row && row.updated_at > p.updatedAt) {
                return res.status(409).json({
                    message: 'Server version is newer',
                    server_updated_at: row.updated_at
                });
            }

            const sql = `
                INSERT INTO service_providers (
                    provider_id, username, business_name, bio, phone, email,
                    location, latitude, longitude, services_json,
                    price_range, availability_json,
                    rating, rating_count, comments_count,
                    views, likes, completed_jobs,
                    profile_image_path, cover_image_path,
                    is_verified, is_active,
                    created_at, updated_at
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(provider_id) DO UPDATE SET
                    username=excluded.username,
                    business_name=excluded.business_name,
                    bio=excluded.bio,
                    phone=excluded.phone,
                    email=excluded.email,
                    location=excluded.location,
                    latitude=excluded.latitude,
                    longitude=excluded.longitude,
                    services_json=excluded.services_json,
                    price_range=excluded.price_range,
                    availability_json=excluded.availability_json,
                    rating=excluded.rating,
                    rating_count=excluded.rating_count,
                    comments_count=excluded.comments_count,
                    views=excluded.views,
                    likes=excluded.likes,
                    completed_jobs=excluded.completed_jobs,
                    profile_image_path=excluded.profile_image_path,
                    cover_image_path=excluded.cover_image_path,
                    is_verified=excluded.is_verified,
                    is_active=excluded.is_active,
                    updated_at=excluded.updated_at
            `;

            const values = [
                p.providerId,
                p.username,
                p.businessName,
                p.bio,
                p.phone,
                p.email,
                p.location,
                p.latitude,
                p.longitude,
                p.servicesJson,
                p.priceRange,
                p.availabilityJson,
                p.rating || 0,
                p.ratingCount || 0,
                p.commentsCount || 0,
                p.views || 0,
                p.likes || 0,
                p.completedJobs || 0,
                p.profileImagePath,
                p.coverImagePath,
                p.isVerified ? 1 : 0,
                p.isActive ? 1 : 0,
                p.createdAt || now,
                now
            ];

            db.run(sql, values, function (err) {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    message: 'Synced successfully',
                    updated_at: now
                });
            });
        }
    );
});

/**
 * ⚡ PARTIAL ACTIONS
 */
app.post('/providers/:id/action', (req, res) => {
    const { id } = req.params;
    const { action, value } = req.body;

    let sql, params;

    if (action === 'view') {
        sql = 'UPDATE service_providers SET views = views + 1, updated_at=? WHERE provider_id=?';
        params = [serverTime(), id];
    } else if (action === 'like') {
        sql = 'UPDATE service_providers SET likes = likes + 1, updated_at=? WHERE provider_id=?';
        params = [serverTime(), id];
    } else if (action === 'rating') {
        sql = `
            UPDATE service_providers
            SET rating = ((rating * rating_count) + ?) / (rating_count + 1),
                rating_count = rating_count + 1,
                updated_at=?
            WHERE provider_id=?
        `;
        params = [value, serverTime(), id];
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Action applied' });
    });
});

/* =========================
   SERVER START
========================= */
app.listen(PORT, () => {
    console.log(✅ `Service Providers Server running on http://localhost:${PORT}`);
});
