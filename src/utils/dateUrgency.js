// Cor do selo de data conforme ela se aproxima, usando os tokens de tema já existentes
// (--success/--warning/--destructive), então funciona igual no claro e no escuro.
export const corUrgenciaData = (dataIso, concluida) => {
    if (concluida) return 'bg-success/15 text-success';
    if (!dataIso) return 'bg-primary/10 text-primary';

    const horasRestantes = (new Date(dataIso) - new Date()) / 3600000;
    if (horasRestantes < 0) return 'bg-destructive/15 text-destructive'; // atrasada
    if (horasRestantes <= 72) return 'bg-warning/15 text-warning'; // até 3 dias
    return 'bg-primary/10 text-primary'; // ainda distante
};
