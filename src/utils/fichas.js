import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const API_PROXY = '/api/dataverse-proxy';

// Avisa, dentro do app, as fichas com data que foram atribuídas ao usuário e ainda não
// foram avisadas. Se o push já chegou no dispositivo, o servidor marca a ficha como 'Sim' e
// este aviso não se repete.
export const avisarFichasDoResponsavel = async (user) => {
  if (!user) return;
  try {
    const filtro = encodeURIComponent(`cr4a1_responsavel_login eq '${user}'`);
    const data = await (await fetch(`${API_PROXY}?table=cr4a1_fichas&$filter=${filtro}`)).json();
    const pendentes = (data.value || []).filter(f => f.cr4a1_data_inicio && f.cr4a1_notificado !== 'Sim');
    for (const ficha of pendentes) {
      toast.success(`Nova ficha com data: ${ficha.cr4a1_titulo} (${format(new Date(ficha.cr4a1_data_inicio), 'dd/MM HH:mm')})`, { icon: '📌', duration: 7000 });
      await fetch(`${API_PROXY}?table=cr4a1_fichas&id=${ficha.cr4a1_fichaid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cr4a1_notificado: 'Sim' })
      });
    }
  } catch (error) {
    console.error('Erro ao verificar fichas:', error);
  }
};
