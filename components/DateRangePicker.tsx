import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme';

interface DateRangePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectRange: (startDate: Date, endDate: Date) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  isVisible,
  onClose,
  onSelectRange,
}) => {
  const today = new Date();
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSelectDate = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // First selection or reset after both dates selected
      setSelectedStartDate(selectedDate);
      setSelectedEndDate(null);
    } else {
      // Second selection
      if (selectedDate < selectedStartDate) {
        // If second selection is before first, swap them
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(selectedDate);
      } else {
        setSelectedEndDate(selectedDate);
      }
    }
  };

  const applyDateRange = () => {
    if (selectedStartDate && selectedEndDate) {
      // Set time to include the full end date
      const endDate = new Date(selectedEndDate);
      endDate.setHours(23, 59, 59, 999);
      
      onSelectRange(selectedStartDate, endDate);
      onClose();
    }
  };

  const isDateSelected = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    
    if (selectedStartDate && selectedEndDate) {
      return (
        currentDate.getTime() === selectedStartDate.getTime() ||
        currentDate.getTime() === selectedEndDate.getTime() ||
        (currentDate > selectedStartDate && currentDate < selectedEndDate)
      );
    }
    
    return selectedStartDate && currentDate.getTime() === selectedStartDate.getTime();
  };

  const isDateInRange = (day: number) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    return (
      currentDate > selectedStartDate && 
      currentDate < selectedEndDate
    );
  };

  const isStartDate = (day: number) => {
    if (!selectedStartDate) return false;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    return currentDate.getTime() === selectedStartDate.getTime();
  };

  const isEndDate = (day: number) => {
    if (!selectedEndDate) return false;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    return currentDate.getTime() === selectedEndDate.getTime();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    
    const daysArray = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = isDateSelected(day);
      const isRange = isDateInRange(day);
      const isStart = isStartDate(day);
      const isEnd = isEndDate(day);
      
      daysArray.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.dayCell,
            isSelected && styles.selectedDay,
            isRange && styles.rangeDay,
            isStart && styles.startDay,
            isEnd && styles.endDay,
          ]}
          onPress={() => handleSelectDate(day)}
        >
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedDayText
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return daysArray;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  const handleCloseModal = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    onClose();
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    
    setSelectedStartDate(start);
    setSelectedEndDate(end);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Rango de Fechas</Text>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickSelects}>
            <TouchableOpacity style={styles.quickSelectButton} onPress={() => setQuickRange(7)}>
              <Text style={styles.quickSelectText}>7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickSelectButton} onPress={() => setQuickRange(14)}>
              <Text style={styles.quickSelectText}>14 días</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickSelectButton} onPress={() => setQuickRange(30)}>
              <Text style={styles.quickSelectText}>30 días</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedText}>
              {selectedStartDate 
                ? `De: ${formatDate(selectedStartDate)}` 
                : 'Seleccione fecha de inicio'}
            </Text>
            <Text style={styles.selectedText}>
              {selectedEndDate 
                ? `A: ${formatDate(selectedEndDate)}` 
                : selectedStartDate 
                  ? 'Seleccione fecha de fin' 
                  : ''}
            </Text>
          </View>
          
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.monthYearLabel}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekDaysContainer}>
            {weekDays.map(day => (
              <Text key={day} style={styles.weekDay}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.calendarGrid}>{renderCalendar()}</View>
          
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.applyButton, (!selectedStartDate || !selectedEndDate) && styles.disabledButton]} 
              onPress={applyDateRange}
              disabled={!selectedStartDate || !selectedEndDate}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 5,
  },
  quickSelects: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickSelectButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickSelectText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  selectedInfo: {
    backgroundColor: COLORS.subtle,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  selectedText: {
    fontSize: 14,
    color: COLORS.text,
    marginVertical: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navButton: {
    padding: 5,
  },
  monthYearLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 5,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textLight,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: '500',
  },
  rangeDay: {
    backgroundColor: COLORS.primaryLight,
  },
  startDay: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  endDay: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  footer: {
    alignItems: 'center',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.subtle,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
