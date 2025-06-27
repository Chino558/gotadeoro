import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import '../theme/app_colors.dart';

class CircularWeightSlider extends StatefulWidget {
  final double value;
  final double minValue;
  final double maxValue;
  final ValueChanged<double> onChanged;
  final VoidCallback? onChangeStart;
  final VoidCallback? onChangeEnd;
  
  const CircularWeightSlider({
    Key? key,
    required this.value,
    this.minValue = 0,
    this.maxValue = 2000,
    required this.onChanged,
    this.onChangeStart,
    this.onChangeEnd,
  }) : super(key: key);

  @override
  State<CircularWeightSlider> createState() => _CircularWeightSliderState();
}

class _CircularWeightSliderState extends State<CircularWeightSlider> {
  bool _isDragging = false;
  double _lastAngle = 0;
  double _accumulatedAngle = 0;
  double _lastHapticValue = 0;
  
  @override
  void initState() {
    super.initState();
    _accumulatedAngle = _valueToAngle(widget.value);
    _lastHapticValue = widget.value;
  }
  
  double _valueToAngle(double value) {
    final normalized = (value - widget.minValue) / (widget.maxValue - widget.minValue);
    return normalized * 2 * math.pi;
  }
  
  double _angleToValue(double angle) {
    // Keep angle in valid range
    while (angle < 0) angle += 2 * math.pi;
    while (angle > 2 * math.pi) angle = 2 * math.pi;
    
    final normalized = angle / (2 * math.pi);
    final value = widget.minValue + normalized * (widget.maxValue - widget.minValue);
    
    // Round to nearest 10g
    return (value / 10).round() * 10.0;
  }
  
  double _getAngleFromPoint(Offset point, Offset center) {
    final dx = point.dx - center.dx;
    final dy = point.dy - center.dy;
    
    // Get angle (0 at 3 o'clock)
    double angle = math.atan2(dy, dx);
    
    // Shift to start at 12 o'clock
    angle = angle + math.pi / 2;
    
    // Normalize to 0-2π
    if (angle < 0) angle += 2 * math.pi;
    
    return angle;
  }
  
  void _updateValue(Offset localPosition, Size size, {bool isStart = false}) {
    final center = Offset(size.width / 2, size.height / 2);
    final currentAngle = _getAngleFromPoint(localPosition, center);
    
    if (isStart) {
      _lastAngle = currentAngle;
      _accumulatedAngle = _valueToAngle(widget.value);
    } else {
      // Calculate the difference, handling the wrap-around at 0/2π
      double diff = currentAngle - _lastAngle;
      
      // Handle wrap-around
      if (diff > math.pi) {
        diff -= 2 * math.pi;
      } else if (diff < -math.pi) {
        diff += 2 * math.pi;
      }
      
      _accumulatedAngle += diff;
      _lastAngle = currentAngle;
      
      // Clamp accumulated angle
      _accumulatedAngle = _accumulatedAngle.clamp(0, 2 * math.pi);
    }
    
    final newValue = _angleToValue(_accumulatedAngle);
    
    // Only trigger haptic feedback at certain intervals (every 50g)
    if ((newValue - _lastHapticValue).abs() >= 50) {
      HapticFeedback.selectionClick();
      _lastHapticValue = newValue;
    }
    
    widget.onChanged(newValue);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (details) {
        setState(() => _isDragging = true);
        widget.onChangeStart?.call();
        
        final RenderBox box = context.findRenderObject() as RenderBox;
        _updateValue(details.localPosition, box.size, isStart: true);
      },
      onPanUpdate: (details) {
        final RenderBox box = context.findRenderObject() as RenderBox;
        _updateValue(details.localPosition, box.size);
      },
      onPanEnd: (details) {
        setState(() => _isDragging = false);
        widget.onChangeEnd?.call();
      },
      onTapDown: (details) {
        final RenderBox box = context.findRenderObject() as RenderBox;
        final size = box.size;
        final center = Offset(size.width / 2, size.height / 2);
        
        // Check if tap is on the track
        final distance = (details.localPosition - center).distance;
        if (distance > 80 && distance < 140) {
          final angle = _getAngleFromPoint(details.localPosition, center);
          final value = _angleToValue(angle);
          
          HapticFeedback.selectionClick();
          _accumulatedAngle = angle;
          widget.onChanged(value);
        }
      },
      child: Container(
        width: 280,
        height: 280,
        decoration: BoxDecoration(
          color: AppColors.card,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: CustomPaint(
          painter: CircularSliderPainter(
            value: widget.value,
            minValue: widget.minValue,
            maxValue: widget.maxValue,
            isDragging: _isDragging,
          ),
        ),
      ),
    );
  }
}

class CircularSliderPainter extends CustomPainter {
  final double value;
  final double minValue;
  final double maxValue;
  final bool isDragging;
  
  CircularSliderPainter({
    required this.value,
    required this.minValue,
    required this.maxValue,
    required this.isDragging,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 30;
    
    // Track
    final trackPaint = Paint()
      ..color = AppColors.borderLight.withOpacity(0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 24
      ..strokeCap = StrokeCap.round;
    
    canvas.drawCircle(center, radius, trackPaint);
    
    // Active track
    final percentage = (value - minValue) / (maxValue - minValue);
    final sweepAngle = percentage * 2 * math.pi;
    
    if (sweepAngle > 0.01) {
      final activePaint = Paint()
        ..shader = LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ).createShader(Rect.fromCircle(center: center, radius: radius))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 24
        ..strokeCap = StrokeCap.round;
      
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        sweepAngle,
        false,
        activePaint,
      );
    }
    
    // Handle
    final handleAngle = sweepAngle - math.pi / 2;
    final handleCenter = Offset(
      center.dx + radius * math.cos(handleAngle),
      center.dy + radius * math.sin(handleAngle),
    );
    
    // Handle shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.15)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    
    canvas.drawCircle(handleCenter, 18, shadowPaint);
    
    // Handle outer
    canvas.drawCircle(
      handleCenter,
      18,
      Paint()..color = isDragging ? AppColors.primaryDark : AppColors.primary,
    );
    
    // Handle inner
    canvas.drawCircle(
      handleCenter,
      14,
      Paint()..color = Colors.white,
    );
    
    // Handle dot
    canvas.drawCircle(
      handleCenter,
      5,
      Paint()..color = isDragging ? AppColors.primaryDark : AppColors.primary,
    );
    
    // Markers
    _drawMarkers(canvas, center, radius);
    
    // Center display
    _drawCenterDisplay(canvas, center);
  }
  
  void _drawMarkers(Canvas canvas, Offset center, double radius) {
    final markerPaint = Paint()
      ..color = AppColors.textLight.withOpacity(0.4);
    
    // Major markers every 500g
    for (int i = 0; i <= 4; i++) {
      final weight = i * 500.0;
      if (weight > maxValue) break;
      
      final angle = (weight / maxValue) * 2 * math.pi - math.pi / 2;
      
      // Marker line
      final innerRadius = radius - 12;
      final outerRadius = radius - 24;
      
      final start = Offset(
        center.dx + innerRadius * math.cos(angle),
        center.dy + innerRadius * math.sin(angle),
      );
      final end = Offset(
        center.dx + outerRadius * math.cos(angle),
        center.dy + outerRadius * math.sin(angle),
      );
      
      markerPaint.strokeWidth = 2.5;
      canvas.drawLine(start, end, markerPaint);
      
      // Label
      if (weight == 0 || weight == 1000 || weight == 2000) {
        final labelRadius = radius - 40;
        final labelCenter = Offset(
          center.dx + labelRadius * math.cos(angle),
          center.dy + labelRadius * math.sin(angle),
        );
        
        final label = weight == 0 ? '0' : '${weight ~/ 1000}kg';
        final textPainter = TextPainter(
          text: TextSpan(
            text: label,
            style: TextStyle(
              color: AppColors.text.withOpacity(0.6),
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          textDirection: TextDirection.ltr,
        );
        textPainter.layout();
        
        textPainter.paint(
          canvas,
          labelCenter - Offset(textPainter.width / 2, textPainter.height / 2),
        );
      }
    }
    
    // Minor markers every 250g
    for (int i = 1; i <= 7; i += 2) {
      final weight = i * 250.0;
      if (weight > maxValue) break;
      
      final angle = (weight / maxValue) * 2 * math.pi - math.pi / 2;
      
      final innerRadius = radius - 12;
      final outerRadius = radius - 20;
      
      final start = Offset(
        center.dx + innerRadius * math.cos(angle),
        center.dy + innerRadius * math.sin(angle),
      );
      final end = Offset(
        center.dx + outerRadius * math.cos(angle),
        center.dy + outerRadius * math.sin(angle),
      );
      
      markerPaint.strokeWidth = 1.5;
      canvas.drawLine(start, end, markerPaint);
    }
  }
  
  void _drawCenterDisplay(Canvas canvas, Offset center) {
    // Background
    canvas.drawCircle(
      center,
      65,
      Paint()..color = AppColors.card,
    );
    
    // Border
    canvas.drawCircle(
      center,
      65,
      Paint()
        ..color = isDragging ? AppColors.primary.withOpacity(0.3) : AppColors.borderLight.withOpacity(0.2)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    
    // Value
    final displayValue = value >= 1000
        ? (value / 1000).toStringAsFixed(value % 1000 == 0 ? 0 : 2)
        : value.toStringAsFixed(0);
    
    final valuePainter = TextPainter(
      text: TextSpan(
        text: displayValue,
        style: TextStyle(
          color: AppColors.text,
          fontSize: 38,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    valuePainter.layout();
    
    valuePainter.paint(
      canvas,
      center - Offset(valuePainter.width / 2, valuePainter.height / 2 + 8),
    );
    
    // Unit
    final unit = value >= 1000 ? 'kg' : 'gramos';
    final unitPainter = TextPainter(
      text: TextSpan(
        text: unit,
        style: TextStyle(
          color: AppColors.textLight,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    unitPainter.layout();
    
    unitPainter.paint(
      canvas,
      center - Offset(unitPainter.width / 2, -12),
    );
  }
  
  @override
  bool shouldRepaint(CircularSliderPainter oldDelegate) {
    return oldDelegate.value != value || oldDelegate.isDragging != isDragging;
  }
}