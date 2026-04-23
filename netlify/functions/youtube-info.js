import ytdl from '@distube/ytdl-core';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: cors, body: '' };
    }

    try {
        const { url } = JSON.parse(event.body || '{}');
        if (!url) {
            return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'URL이 필요합니다.' }) };
        }

        const info = await ytdl.getInfo(url);

        // 오디오+비디오 합쳐진 포맷만 필터 (MP4 우선, 높은 화질 우선)
        const formats = info.formats
            .filter(f => f.hasVideo && f.hasAudio)
            .sort((a, b) => {
                const qa = parseInt(a.qualityLabel) || 0;
                const qb = parseInt(b.qualityLabel) || 0;
                if (qb !== qa) return qb - qa;
                if (a.container === 'mp4' && b.container !== 'mp4') return -1;
                if (b.container === 'mp4' && a.container !== 'mp4') return 1;
                return 0;
            });

        const format = formats[0];
        if (!format) {
            return { statusCode: 404, headers: cors, body: JSON.stringify({ error: '사용 가능한 영상 포맷을 찾을 수 없습니다.' }) };
        }

        return {
            statusCode: 200,
            headers: cors,
            body: JSON.stringify({
                url: format.url,
                quality: format.qualityLabel,
                mimeType: format.mimeType,
                title: info.videoDetails.title,
                contentLength: format.contentLength,
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: cors,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
