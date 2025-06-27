import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class DateRangePicker extends StatefulWidget {
  final bool isVisible;
  final VoidCallback onClose;
  final Function(DateTime startDate, DateTime endDate) onSelectRange;

  const DateRangePicker({
    Key? key,
    required this.isVisible,
    required this.onClose,
    required this.onSelectRange,
  }) : super(key: key);

  @override
  State<DateRangePicker> createState() => _DateRangePickerState();
}

class _DateRangePickerState extends State<DateRangePicker> {
  DateTime? startDate;
  DateTime? endDate;

  Future<void> _selectDateRange(BuildContext context) async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: startDate != null && endDate != null
          ? DateTimeRange(start: startDate!, end: endDate!)
          : null,      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppColors.text,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        startDate = picked.start;
        endDate = picked.end;
      });
      widget.onSelectRange(picked.start, picked.end);
      widget.onClose();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isVisible) return const SizedBox();

    // Automatically show the date range picker when visible
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.isVisible) {        _selectDateRange(context).then((_) {
          if (startDate == null || endDate == null) {
            widget.onClose();
          }
        });
      }
    });

    return const SizedBox(); // The actual picker is shown as a dialog
  }
}
