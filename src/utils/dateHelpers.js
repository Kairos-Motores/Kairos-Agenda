import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format 
} from 'date-fns';

export const generateMonthDays = (currentDate) => {
  const start = startOfWeek(startOfMonth(currentDate));
  const end = endOfWeek(endOfMonth(currentDate));

  return eachDayOfInterval({ start, end });
};

export const formatDate = (date, pattern = 'yyyy-MM-dd') => {
  return format(date, pattern);
};