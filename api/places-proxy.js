import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY não configurada no servidor.' });
  }

  const { action, q, placeId, name, maxWidthPx } = req.query;

  try {
    if (action === 'autocomplete') {
      const input = String(q || '').trim();
      if (input.length < 2) return res.status(200).json({ suggestions: [] });

      const response = await axios.post(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          input,
          includedRegionCodes: ['br', 'pt'],
          languageCode: 'pt-BR'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey
          }
        }
      );

      const suggestions = (response.data?.suggestions || [])
        .filter((s) => s.placePrediction)
        .map((s) => {
          const p = s.placePrediction;
          const mainText = p.structuredFormat?.mainText?.text || p.text?.text || '';
          const secondaryText = p.structuredFormat?.secondaryText?.text || '';
          return {
            placeId: p.placeId,
            mainText,
            secondaryText,
            fullText: p.text?.text || [mainText, secondaryText].filter(Boolean).join(' — ')
          };
        });

      return res.status(200).json({ suggestions });
    }

    if (action === 'details') {
      let place = null;

      if (placeId) {
        const detRes = await axios.get(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(String(placeId))}`,
          {
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,formattedAddress,photos'
            },
            params: { languageCode: 'pt-BR' }
          }
        );
        place = detRes.data;
      } else if (q && String(q).trim().length >= 2) {
        const searchRes = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: String(q).trim(),
            languageCode: 'pt-BR',
            maxResultCount: 1
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos'
            }
          }
        );
        place = searchRes.data?.places?.[0] || null;
      }

      if (!place) {
        return res.status(200).json({ place: null });
      }

      const photoName = place.photos?.[0]?.name || null;
      const photoUrl = photoName
        ? `/api/places-proxy?action=photo&name=${encodeURIComponent(photoName)}`
        : null;

      return res.status(200).json({
        place: {
          placeId: place.id,
          name: place.displayName?.text || '',
          address: place.formattedAddress || '',
          photoUrl
        }
      });
    }

    if (action === 'photo') {
      const photoName = String(name || '').trim();
      if (!photoName || !photoName.startsWith('places/')) {
        return res.status(400).json({ error: 'Parâmetro name inválido.' });
      }

      const width = Math.min(Math.max(Number(maxWidthPx) || 900, 200), 1600);
      const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${apiKey}`;
      const imgRes = await axios.get(mediaUrl, { responseType: 'arraybuffer' });

      res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.status(200).send(Buffer.from(imgRes.data));
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (err) {
    console.error('Erro no places-proxy:', err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: 'Falha ao consultar Google Places.',
      details: err.response?.data?.error?.message || err.message
    });
  }
}
