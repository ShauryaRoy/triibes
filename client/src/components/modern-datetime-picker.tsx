import { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModernDateTimePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  timezone?: string;
  onSetTBD?: () => void;
  isTBD?: boolean;
}

export function ModernDateTimePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  timezone = 'IST GMT +5:30',
  onSetTBD,
  isTBD = false
}: ModernDateTimePickerProps) {
  const [activeField, setActiveField] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('19:00');

  // Initialize times from props
  useEffect(() => {
    const activeDate = activeField === 'start' ? startDate : endDate;
    if (activeDate) {
      const hours = activeDate.getHours().toString().padStart(2, '0');
      const minutes = activeDate.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [activeField, startDate, endDate]);

  // Generate time slots (15-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    
    // Set time from selected time slot
    const [hours, minutes] = selectedTime.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    
    if (activeField === 'start') {
      onStartDateChange(newDate);
      // If end date is before new start date, adjust it
      if (endDate && newDate > endDate) {
        const newEndDate = new Date(newDate);
        newEndDate.setHours(newDate.getHours() + 3); // Default 3 hours later
        onEndDateChange(newEndDate);
      }
    } else {
      // Prevent selecting end date before start date
      if (startDate && newDate < startDate) {
        return;
      }
      onEndDateChange(newDate);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    const [hours, minutes] = time.split(':').map(Number);
    
    const activeDate = activeField === 'start' ? startDate : endDate;
    if (activeDate) {
      const newDate = new Date(activeDate);
      newDate.setHours(hours, minutes, 0, 0);
      
      if (activeField === 'start') {
        onStartDateChange(newDate);
        // Auto-adjust end time if needed
        if (endDate && newDate > endDate) {
          const newEndDate = new Date(newDate);
          newEndDate.setHours(hours + 3, minutes, 0, 0);
          onEndDateChange(newEndDate);
        }
      } else {
        if (startDate && newDate < startDate) {
          return;
        }
        onEndDateChange(newDate);
      }
    }
  };

  const formatDateSummary = () => {
    if (isTBD) return 'Date & Time TBD';
    if (!startDate) return 'Select start date and time';
    
    const startDay = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (!endDate) return `${startDay} · ${startTime}`;
    
    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    
    if (isSameDay) {
      return `${startDay} · ${startTime} – ${endTime}`;
    } else {
      const endDay = endDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      return `${startDay} ${startTime} – ${endDay} ${endTime}`;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isDateSelected = (day: number) => {
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const activeDate = activeField === 'start' ? startDate : endDate;
    return activeDate?.toDateString() === dateToCheck.toDateString();
  };

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return dateToCheck > startDate && dateToCheck < endDate;
  };

  const isDateDisabled = (day: number) => {
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (dateToCheck < today) return true;
    
    // If selecting end date, disable dates before start date
    if (activeField === 'end' && startDate) {
      return dateToCheck < startDate;
    }
    
    return false;
  };

  if (isTBD) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50 p-6">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-white text-lg font-medium mb-2">Date & Time TBD</h3>
          <p className="text-slate-400 text-sm mb-4">Event date and time will be announced later</p>
          {onSetTBD && (
            <Button
              onClick={() => onSetTBD()}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Set Date & Time
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/20 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-white text-lg sm:text-xl font-medium mb-1">
              {formatDateSummary()}
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm">{timezone}</p>
          </div>
          {onSetTBD && (
            <Button
              onClick={() => onSetTBD()}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10 text-xs sm:text-sm"
            >
              Set as TBD
            </Button>
          )}
        </div>
      </Card>

      {/* Start/End Field Selector */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveField('start')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all text-left',
            activeField === 'start'
              ? 'border-primary bg-primary/10'
              : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50'
          )}
        >
          <div className="text-xs text-slate-400 mb-1">Start</div>
          <div className="text-white font-medium text-sm sm:text-base">
            {startDate ? (
              <>
                <div>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="text-primary text-xs sm:text-sm">
                  {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </>
            ) : (
              <span className="text-slate-500">Not set</span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveField('end')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all text-left',
            activeField === 'end'
              ? 'border-primary bg-primary/10'
              : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50'
          )}
        >
          <div className="text-xs text-slate-400 mb-1">End</div>
          <div className="text-white font-medium text-sm sm:text-base">
            {endDate ? (
              <>
                <div>{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="text-primary text-xs sm:text-sm">
                  {endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
              </>
            ) : (
              <span className="text-slate-500">Not set</span>
            )}
          </div>
        </button>
      </div>

      {/* Calendar and Time Picker */}
      <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Calendar */}
          <div className="lg:col-span-2 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-700">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium text-base sm:text-lg">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs text-slate-400 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const selected = isDateSelected(day);
                  const inRange = isDateInRange(day);
                  const disabled = isDateDisabled(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !disabled && handleDateSelect(day)}
                      disabled={disabled}
                      className={cn(
                        'aspect-square rounded-lg text-sm font-medium transition-all',
                        'flex items-center justify-center relative',
                        disabled && 'opacity-30 cursor-not-allowed',
                        !disabled && !selected && !inRange && 'text-white hover:bg-slate-700',
                        selected && 'bg-primary text-white ring-2 ring-primary/50',
                        inRange && !selected && 'bg-primary/20 text-white'
                      )}
                    >
                      {day}
                      {selected && (
                        <div className="absolute -top-1 -right-1">
                          <Check className="h-3 w-3 text-primary bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Picker */}
          <div className="p-4 sm:p-6">
            <h3 className="text-white font-medium mb-4 text-sm sm:text-base">Time</h3>
            <div className="space-y-1 max-h-64 sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
              {timeSlots.map(time => {
                const [hours, minutes] = time.split(':').map(Number);
                const hour12 = hours % 12 || 12;
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

                // Check if this time is disabled
                const activeDate = activeField === 'start' ? startDate : endDate;
                let isTimeDisabled = false;
                
                if (activeField === 'end' && startDate && activeDate) {
                  const testDate = new Date(activeDate);
                  testDate.setHours(hours, minutes, 0, 0);
                  isTimeDisabled = testDate <= startDate;
                }

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => !isTimeDisabled && handleTimeSelect(time)}
                    disabled={isTimeDisabled}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left transition-all text-sm',
                      selectedTime === time
                        ? 'bg-primary text-white font-medium'
                        : isTimeDisabled
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    {displayTime}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
