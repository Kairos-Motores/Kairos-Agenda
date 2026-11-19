// Mesmo padrão já usado pelos anexos de evento e evidências do SSMA: cada arquivo vira um
// data URL base64 guardado direto numa coluna de texto do Dataverse (sem serviço de storage
// à parte). O campo aguenta ~1.048.576 caracteres — damos uma boa margem abaixo disso pra
// sobrar espaço pro JSON em volta (nome, tamanho...) e pra mais de um arquivo.
export const MAX_ANEXO_BYTES = 400 * 1024; // 400 KB por arquivo (legado/eventos)
export const MAX_TOTAL_ANEXOS_BYTES = 700 * 1024; // ~700 KB somando todos os anexos do mesmo registro (legado)

// Limite para anexos das FICHAS: salvos diretamente na tabela dedicada "annotations" do Dataverse.
// Cada arquivo é um registro independente, superando o teto de 1 MB da coluna de texto e permitindo
// múltiplos arquivos grandes por cartão.
export const MAX_ANEXO_FICHA_BYTES = Math.floor(3.5 * 1024 * 1024); // 3.5 MB por arquivo

export const formatarTamanho = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const parseAnexos = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

export const lerArquivoComoBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const somaTamanhos = (anexos) => anexos.reduce((acc, a) => acc + (a.size || 0), 0);

export const ehImagem = (fileOrAnexo) => {
  const nome = (fileOrAnexo?.name || '').toLowerCase();
  const tipo = (fileOrAnexo?.type || '').toLowerCase();
  return tipo.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(nome);
};

export const tipoDoAnexo = (anexo) => {
  const nome = (anexo?.name || '').toLowerCase();
  if (anexo?.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(nome)) return 'imagem';
  if (anexo?.type === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  return 'arquivo';
};

export const primeiraImagem = (anexos) => (anexos || []).find(a => tipoDoAnexo(a) === 'imagem') || null;

export const obterBase64Anexo = async (anexo) => {
  if (anexo?.base64) return anexo.base64;
  if (!anexo?.annotationId) return null;
  try {
    const res = await fetch(`/api/dataverse-proxy?table=annotations&id=${anexo.annotationId}&$select=documentbody,mimetype,filename`);
    if (!res.ok) throw new Error('Falha ao baixar anexo do Dataverse');
    const data = await res.json();
    const mime = data.mimetype || anexo.type || 'application/octet-stream';
    const dataUrl = `data:${mime};base64,${data.documentbody}`;
    anexo.base64 = dataUrl;
    return dataUrl;
  } catch (err) {
    console.error('Erro ao obter anexo do Dataverse:', err);
    return null;
  }
};

export const baixarAnexo = async (anexo) => {
  const base64 = await obterBase64Anexo(anexo);
  if (!base64) return;
  const a = document.createElement('a');
  a.href = base64;
  a.download = anexo.name;
  a.click();
};

export const uploadAnexoDataverse = async (fichaId, processado) => {
  if (!fichaId) throw new Error('ID da ficha ausente para o upload.');
  const rawBase64 = processado.base64.includes(',')
    ? processado.base64.split(',')[1]
    : processado.base64;

  const res = await fetch('/api/dataverse-proxy?table=annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      subject: `Anexo Ficha: ${processado.name}`,
      filename: processado.name,
      mimetype: processado.type || 'application/octet-stream',
      documentbody: rawBase64,
      'objectid_cr4a1_ficha@odata.bind': `/cr4a1_fichas(${fichaId})`
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Erro ao salvar anexo no Dataverse.');
  }

  const data = await res.json();
  return {
    id: data.annotationid,
    annotationId: data.annotationid,
    name: processado.name,
    size: processado.size,
    type: processado.type,
    base64: processado.base64,
    thumbnail: processado.thumbnail
  };
};

export const removerAnexoDataverse = async (annotationId) => {
  if (!annotationId) return;
  try {
    await fetch(`/api/dataverse-proxy?table=annotations&id=${annotationId}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.warn('Erro ao deletar anexo no Dataverse:', e);
  }
};

/**
 * Comprime imagens grandes no próprio navegador usando HTML5 Canvas.
 * Permite que fotos de alta resolução (ex.: 5 MB a 20 MB tiradas do celular)
 * sejam reduzidas em milissegundos para ~150 KB - 280 KB com excelente nitidez,
 * cabendo perfeitamente dentro do limite seguro do Dataverse.
 */
export const comprimirImagemParaAnexo = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const { maxWidth = 1600, maxHeight = 1600, quality = 0.75 } = options;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Gera em JPEG para compressão máxima com excelente fidelidade
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          let approxBytes = Math.round((dataUrl.length * 3) / 4);

          // Se ainda passar de 360 KB, faz passes sucessivos com menor qualidade/escala
          if (approxBytes > 360 * 1024) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.62);
            approxBytes = Math.round((dataUrl.length * 3) / 4);
          }
          if (approxBytes > 360 * 1024) {
            canvas.width = Math.round(width * 0.75);
            canvas.height = Math.round(height * 0.75);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.55);
            approxBytes = Math.round((dataUrl.length * 3) / 4);
          }

          const originalExt = file.name.split('.').pop() || 'jpg';
          const novoNome = file.name.replace(/\.[^/.]+$/, '') + '.jpg';

          let thumbnail = null;
          try {
            const thumbCanvas = document.createElement('canvas');
            const thumbRatio = Math.min(260 / (width || 1), 160 / (height || 1), 1);
            thumbCanvas.width = Math.max(1, Math.round((width || 1) * thumbRatio));
            thumbCanvas.height = Math.max(1, Math.round((height || 1) * thumbRatio));
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
            thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.65);
          } catch {}

          resolve({
            name: novoNome,
            size: approxBytes,
            type: 'image/jpeg',
            base64: dataUrl,
            thumbnail,
            originalSize: file.size,
            foiComprimido: file.size > approxBytes
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Processa qualquer arquivo para anexo:
 * - Se for imagem: comprime automaticamente para caber dentro da cota
 * - Se for arquivo não-imagem (PDF, TXT...): lê em base64 direto
 */
export const processarArquivoParaAnexo = async (file) => {
  if (ehImagem(file)) {
    // Se for PNG leve (< 200 KB) com transparência, preserva sem alterar
    if (file.type === 'image/png' && file.size <= 200 * 1024) {
      const base64 = await lerArquivoComoBase64(file);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        base64,
        originalSize: file.size,
        foiComprimido: false
      };
    }
    // Se for SVG vetorial leve (< 200 KB), preserva original
    if (file.type === 'image/svg+xml' && file.size <= 200 * 1024) {
      const base64 = await lerArquivoComoBase64(file);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        base64,
        originalSize: file.size,
        foiComprimido: false
      };
    }
    // Fotos pesadas e capturas de tela passam pela compressão inteligente
    return await comprimirImagemParaAnexo(file);
  }

  // Arquivos não-imagem
  const base64 = await lerArquivoComoBase64(file);
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    base64,
    originalSize: file.size,
    foiComprimido: false
  };
};
