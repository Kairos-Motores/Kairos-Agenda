// Ícone "02" da Kairós Agenda — mesma composição do ícone principal (public/icon-kairos-02.svg),
// mas como SVG inline: assim herda a fonte Poppins já carregada na página (um <img src="...svg">
// externo não teria acesso a ela) e pode reagir ao tema claro/escuro via props.
export const KairosIcon = ({ size = 26, dark = false }) => {
    const frameTop = dark ? '#aeb4c2' : '#2f323c';
    const frameBottom = dark ? '#7d8294' : '#101116';
    const side = dark ? '#6c7284' : '#08090b';
    const page = '#ffffff';
    const ink = '#17181d';
    const gradId = `kairosIconFrame-${dark ? 'dark' : 'light'}`;

    return (
        <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={frameTop} />
                    <stop offset="1" stopColor={frameBottom} />
                </linearGradient>
            </defs>

            <g transform="skewY(-7)">
                <rect x="432" y="56" width="26" height="400" rx="4" fill={side} />
                <rect x="40" y="40" width="400" height="400" rx="92" fill={`url(#${gradId})`} />
                <rect x="180" y="86" width="30" height="66" rx="15" fill={frameBottom} />
                <rect x="302" y="86" width="30" height="66" rx="15" fill={frameBottom} />
                <rect x="118" y="116" width="276" height="260" rx="28" fill={page} />
                <text x="256" y="300" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="172" fill={ink}>02</text>
            </g>
        </svg>
    );
};
