// Favicon dinâmico: desenha o ícone "02" da Kairós com o dia do mês atual no
// lugar do número fixo — igual ao que o Google Calendar faz no ícone dele —
// e atualiza sozinho à meia-noite, sem precisar recarregar a página.

const FRAME_TOP = '#2f323c';
const FRAME_BOTTOM = '#101116';
const SIDE = '#08090b';
const PAGE = '#ffffff';
const INK = '#17181d';

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

const drawIcon = (ctx, size, dayNumber) => {
    const s = size / 512;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(1, 0.985);
    ctx.transform(1, 0, -0.08, 1, 0, 0); // aproxima o skewY usado no icone do cabecalho
    ctx.translate(-size / 2, -size / 2);

    // face lateral
    roundRect(ctx, 432 * s, 56 * s, 26 * s, 400 * s, 4 * s);
    ctx.fillStyle = SIDE;
    ctx.fill();

    // moldura
    const grad = ctx.createLinearGradient(0, 40 * s, 0, 440 * s);
    grad.addColorStop(0, FRAME_TOP);
    grad.addColorStop(1, FRAME_BOTTOM);
    roundRect(ctx, 40 * s, 40 * s, 400 * s, 400 * s, 92 * s);
    ctx.fillStyle = grad;
    ctx.fill();

    // ganchos
    roundRect(ctx, 180 * s, 86 * s, 30 * s, 66 * s, 15 * s);
    ctx.fillStyle = FRAME_BOTTOM;
    ctx.fill();
    roundRect(ctx, 302 * s, 86 * s, 30 * s, 66 * s, 15 * s);
    ctx.fill();

    // pagina branca
    roundRect(ctx, 118 * s, 116 * s, 276 * s, 260 * s, 28 * s);
    ctx.fillStyle = PAGE;
    ctx.fill();

    // numero do dia
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = (dayNumber.length > 1 ? 150 : 180) * s;
    ctx.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
    ctx.fillText(dayNumber, 256 * s, 252 * s + 8 * s);

    ctx.restore();
};

const applyFavicon = (dataUrl) => {
    const rels = ['icon', 'apple-touch-icon'];
    rels.forEach((rel) => {
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
        }
        link.type = 'image/png';
        link.href = dataUrl;
    });
};

const renderTodayFavicon = async () => {
    try {
        if (document.fonts?.load) {
            await document.fonts.load('800 180px Poppins');
        }
    } catch {
        // segue com a fonte padrão se a Poppins não carregar a tempo
    }

    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const day = String(new Date().getDate());

    drawIcon(ctx, size, day);
    applyFavicon(canvas.toDataURL('image/png'));
};

const scheduleMidnightRefresh = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    setTimeout(() => {
        renderTodayFavicon();
        scheduleMidnightRefresh();
    }, msUntilMidnight);
};

export const startDynamicFavicon = () => {
    renderTodayFavicon();
    scheduleMidnightRefresh();
};
