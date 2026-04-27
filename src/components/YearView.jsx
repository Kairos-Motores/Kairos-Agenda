import { startOfYear, addMonths } from 'date-fns';
import { MiniMonth } from './MiniMonth';

export const YearView = ({ currentDate, onSelectMonth }) => {
  const months = Array.from({ length: 12 }, (_, i) => addMonths(startOfYear(currentDate), i));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
      {months.map(month => (
        <MiniMonth 
          key={month.toString()} 
          monthDate={month} 
          onSelectMonth={onSelectMonth} 
        />
      ))}
    </div>
  );
};