/**
 * Ícone Oficial da Kairós Agenda (Cartoon Sticker 18/09)
 * - Cabeçalho preenchido em preto (sólido) como na referência
 * - Inverte cores de alto contraste entre o Modo Claro e Modo Escuro via prop `dark`
 */
export const KairosIcon = ({ size = 26, dark = false, className = '', style = {} }) => {
    // Modo escuro: moldura externa branca de alto contraste, cabeçalho preto sólido, página branca
    // Modo claro: moldura e traços invertem para preto sólido de alto contraste sobre fundo claro
    const stickerBorder = dark ? '#ffffff' : '#111215';
    const stickerWidth = dark ? 24 : 18;
    const cardBg = '#111215'; // Cabeçalho e corpo preenchidos em preto
    const cardOutline = dark ? '#ffffff' : '#111215';
    const gridStroke = dark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.65)';
    const ringBg = '#ffffff';
    const ringStroke = '#111215';
    const pageBg = '#ffffff';
    const textColor = '#111215';

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className={`kairos-icon-svg select-none ${className}`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                display: 'inline-block',
                verticalAlign: 'middle',
                flexShrink: 0,
                ...style
            }}
            draggable={false}
        >
            {/* CARTÃO POSTERIOR (INCLINADO -10 GRAUS) */}
            <g transform="rotate(-10 210 270)">
                <rect
                    x="66" y="96" width="318" height="328" rx="50" ry="50"
                    fill={stickerBorder} stroke={stickerBorder} strokeWidth={stickerWidth} strokeLinejoin="round"
                />
                <rect
                    x="76" y="106" width="298" height="308" rx="42" ry="42"
                    fill={cardBg} stroke={cardOutline} strokeWidth="8" strokeLinejoin="round"
                />
                {/* Cabeçalho posterior preenchido em preto */}
                <path
                    d="M 80 152 A 38 38 0 0 1 118 114 L 332 114 A 38 38 0 0 1 370 152 L 370 196 L 80 196 Z"
                    fill={cardBg}
                />
                {/* Linhas de grade do calendário posterior */}
                <line x1="82" y1="235" x2="368" y2="235" stroke={gridStroke} strokeWidth="6" strokeLinecap="round" />
                <line x1="82" y1="295" x2="368" y2="295" stroke={gridStroke} strokeWidth="6" strokeLinecap="round" />
                <line x1="82" y1="355" x2="368" y2="355" stroke={gridStroke} strokeWidth="6" strokeLinecap="round" />
                <line x1="178" y1="196" x2="178" y2="408" stroke={gridStroke} strokeWidth="6" />
                <line x1="272" y1="196" x2="272" y2="408" stroke={gridStroke} strokeWidth="6" />
                {/* Argolas do cartão posterior */}
                <rect x="144" y="68" width="30" height="72" rx="15" fill={ringBg} stroke={ringStroke} strokeWidth="10" strokeLinejoin="round" />
                <rect x="274" y="68" width="30" height="72" rx="15" fill={ringBg} stroke={ringStroke} strokeWidth="10" strokeLinejoin="round" />
            </g>

            {/* CARTÃO FRONTAL (COM A DATA 18/09) */}
            <g transform="translate(48, 26)">
                <rect
                    x="76" y="90" width="332" height="342" rx="54" ry="54"
                    fill={stickerBorder} stroke={stickerBorder} strokeWidth={stickerWidth} strokeLinejoin="round"
                />
                <rect
                    x="86" y="100" width="312" height="322" rx="46" ry="46"
                    fill={cardBg} stroke={cardOutline} strokeWidth="10" strokeLinejoin="round"
                />

                {/* Cabeçalho frontal pintado / preenchido de preto */}
                <path
                    d="M 92 148 A 40 40 0 0 1 132 108 L 352 108 A 40 40 0 0 1 392 148 L 392 206 L 92 206 Z"
                    fill={cardBg}
                />
                <line x1="96" y1="206" x2="388" y2="206" stroke={cardOutline} strokeWidth="5" />

                {/* Argolas frontais */}
                <rect x="156" y="62" width="34" height="76" rx="17" fill={ringBg} stroke={ringStroke} strokeWidth="11" strokeLinejoin="round" />
                <rect x="290" y="62" width="34" height="76" rx="17" fill={ringBg} stroke={ringStroke} strokeWidth="11" strokeLinejoin="round" />

                {/* Página branca interna */}
                <rect x="108" y="216" width="268" height="192" rx="26" ry="26" fill={pageBg} stroke={cardOutline} strokeWidth="5" />

                {/* Texto 18/09 cartoon */}
                <text
                    x="242"
                    y="348"
                    fontFamily="'Poppins', 'Fredoka', 'Quicksand', 'Nunito', 'Segoe UI', system-ui, sans-serif"
                    fontSize="98"
                    fontWeight="900"
                    fill={textColor}
                    textAnchor="middle"
                    letterSpacing="-2"
                    style={{ userSelect: 'none' }}
                >
                    18/09
                </text>
            </g>
        </svg>
    );
};
