// api/bi-embed.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  // Mapeamento dos IDs para as variáveis de ambiente
  const biUrls = {
    'rh-estrategico': process.env.POWERBI_RH_ESTRATEGICO_URL,
    'rh-geral': process.env.POWERBI_RH_GERAL_URL,
    'comercial-metas': process.env.POWERBI_COMERCIAL_URL,
    'ti-sprint': process.env.VITE_BI_TESTE,
  };

  const url = biUrls[id];
  if (!url) {
    return res.status(404).json({ error: 'BI não encontrado' });
  }

  // ⚠️ Aqui você pode adicionar validação de permissão (token JWT, roles)
  // Por enquanto, apenas retorna a URL se existir

  return res.status(200).json({ url });
}