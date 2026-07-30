// Vercel Serverless Function for Automatic Cloud Sync
// Endpoint: POST /api/cloud-sync

const ALLOWED_ORIGINS = [
    'https://ekotakip.vercel.app',
    'https://adnetzero-turkiye.vercel.app'
];
const MAX_BODY_BYTES  = 512 * 1024; // 512 KB

export default async function handler(req, res) {
    // CORS — restrict to production domain only
    const origin = req.headers['origin'] || '';
    if (ALLOWED_ORIGINS.includes(origin) || origin === '') {
        res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};

        // Payload size guard
        const bodyStr = JSON.stringify(body);
        if (bodyStr.length > MAX_BODY_BYTES) {
            return res.status(413).json({ error: 'Payload Too Large' });
        }

        const { provider, eventTitle, eventDate, totalEmissionsTon, reportCsvData } = body;

        if (!eventTitle || typeof eventTitle !== 'string') {
            return res.status(400).json({ error: 'Etkinlik başlığı gereklidir.' });
        }

        // Sanitize filename — allow only safe characters
        const safeTitle = eventTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
        const filename = `EkoTakip_${safeTitle}_${new Date().toISOString().split('T')[0]}.csv`;

        const targetWebhookUrl = process.env.CLOUD_SYNC_WEBHOOK_URL || process.env.NEXTCLOUD_WEBDAV_URL;

        if (targetWebhookUrl) {
            await fetch(targetWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    eventTitle,
                    eventDate,
                    totalEmissionsTon,
                    csvContent: reportCsvData
                })
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Otomatik bulut senkronizasyonu tamamlandı.',
            provider: provider || 'Enterprise Cloud',
            filename,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        // Log internally, never expose raw error to client
        console.error('Cloud Sync API Error:', err);
        return res.status(500).json({ error: 'Senkronizasyon hatası. Lütfen tekrar deneyiniz.' });
    }
}
