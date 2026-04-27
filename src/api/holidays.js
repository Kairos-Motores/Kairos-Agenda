const BASE_URL = 'https://brasilapi.com.br/api/feriados/v1';

export const fetchNationalHolidays = async (year) => {
  try {
    const response = await fetch(`${BASE_URL}/${year}`);
    if (!response.ok) throw new Error('Erro ao buscar feriados');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};