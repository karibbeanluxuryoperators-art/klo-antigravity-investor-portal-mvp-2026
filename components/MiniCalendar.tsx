import React from 'react';
// Local Language alias — see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

interface MiniCalendarProps {
  bookedDates: string[];
  lang: Language;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ bookedDates, lang }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const monthNames = {
    EN: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    PT: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  }[lang];

  const daysOfWeek = {
    EN: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    ES: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    PT: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  }[lang];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isBooked = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookedDates.includes(dateStr);
  };

  const isToday = (day: number) => {
    return day === today.getDate();
  };

  const t = {
    EN: { available: 'Available', booked: 'Booked' },
    ES: { available: 'Disponible', booked: 'Reservado' },
    PT: { available: 'Disponível', booked: 'Reservado' }
  }[lang];

  return (
    <div className="bg-luxury-slate/50 rounded-xl p-4 border border-border-main">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-sans font-semibold uppercase tracking-tight text-gold">
          {monthNames[currentMonth]} {currentYear}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-[10px] font-sans font-semibold text-text-main/30 text-center uppercase tracking-tight">
            {day}
          </div>
        ))}
        {days.map((day, i) => (
          <div 
            key={i} 
            className={`
              h-6 flex items-center justify-center text-[10px] font-sans rounded-lg transition-all
              ${day === null ? '' : 'hover:bg-luxury-slate/50 cursor-default'}
              ${day !== null && isBooked(day) ? 'bg-luxury-slate/50 text-text-main/20 border border-border-main' : ''}
              ${day !== null && isToday(day) ? 'bg-gold text-luxury-black font-semibold' : 'text-text-main/60'}
              ${day !== null && !isBooked(day) && !isToday(day) ? 'bg-gold/10 text-gold/60' : ''}
            `}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gold/30" />
          <span className="text-[10px] font-sans font-semibold text-text-main/40 uppercase tracking-tight">{t.available}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-luxury-slate/50" />
          <span className="text-[10px] font-sans font-semibold text-text-main/40 uppercase tracking-tight">{t.booked}</span>
        </div>
      </div>
    </div>
  );
};
