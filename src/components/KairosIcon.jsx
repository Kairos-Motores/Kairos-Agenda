import logoImg from '../assets/logo-18-09-bw.png';

/**
 * Ícone Oficial da Kairós Agenda (Cartoon Sticker 18/09)
 * Exibe a data de aniversário da empresa (18/09) no formato de calendário sobreposto cartoon.
 */
export const KairosIcon = ({ size = 26, className = '', style = {}, dark = false }) => {
    return (
        <img
            src={logoImg}
            alt="Kairós Agenda"
            width={size}
            height={size}
            className={`kairos-icon-img select-none ${className}`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                objectFit: 'contain',
                display: 'inline-block',
                verticalAlign: 'middle',
                flexShrink: 0,
                ...style
            }}
            draggable={false}
        />
    );
};
