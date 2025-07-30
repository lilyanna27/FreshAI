import { format, formatDistanceToNow, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';

export const formatExpirationDate = (date: Date): string => {
  return format(date, 'MMM dd, yyyy');
};

export const getExpirationStatus = (expirationDate: Date) => {
  const now = new Date();
  const daysDiff = differenceInDays(expirationDate, now);
  
  if (isPast(expirationDate) && !isToday(expirationDate)) {
    const daysExpired = Math.abs(daysDiff);
    return {
      status: 'expired' as const,
      message: daysExpired === 1 ? 'Expired 1 day ago' : `Expired ${daysExpired} days ago`,
      color: 'text-vermillion',
      bgColor: 'bg-red-100',
      dotColor: 'bg-vermillion'
    };
  }
  
  if (isToday(expirationDate)) {
    return {
      status: 'today' as const,
      message: 'Expires today',
      color: 'text-vermillion',
      bgColor: 'bg-red-100',
      dotColor: 'bg-vermillion'
    };
  }
  
  if (isTomorrow(expirationDate)) {
    return {
      status: 'tomorrow' as const,
      message: 'Expires tomorrow',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      dotColor: 'bg-yellow-500'
    };
  }
  
  if (daysDiff <= 2) {
    return {
      status: 'soon' as const,
      message: `Expires in ${daysDiff} days`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      dotColor: 'bg-yellow-500'
    };
  }
  
  if (daysDiff <= 7) {
    return {
      status: 'fresh' as const,
      message: `Expires in ${daysDiff} days`,
      color: 'text-apple-green',
      bgColor: 'bg-green-100',
      dotColor: 'bg-apple-green'
    };
  }
  
  return {
    status: 'fresh' as const,
    message: `Expires in ${daysDiff} days`,
    color: 'text-apple-green',
    bgColor: 'bg-green-100',
    dotColor: 'bg-apple-green'
  };
};

export const getCurrentDateTime = (): string => {
  const now = new Date();
  return format(now, 'EEEE, MMMM dd');
};
