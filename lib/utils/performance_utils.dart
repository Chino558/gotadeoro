import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'dart:async';

/// Performance utilities for optimizing animations and rendering
class PerformanceUtils {
  static const Duration _60HzFrameDuration = Duration(milliseconds: 17);
  static const Duration _120HzFrameDuration = Duration(milliseconds: 8);
  
  /// Get optimized animation duration based on device refresh rate
  static Duration getOptimizedDuration({
    required Duration baseIf60Hz,
    Duration? baseIf120Hz,
  }) {
    final refreshRate = _getDeviceRefreshRate();
    
    if (refreshRate > 60 && baseIf120Hz != null) {
      return baseIf120Hz;
    }
    
    return baseIf60Hz;
  }
  
  /// Get device refresh rate (approximation)
  static double _getDeviceRefreshRate() {
    // This is a simplification - in production you might want to use
    // platform channels to get actual device refresh rate
    return 60.0; // Default to 60Hz for safety
  }
  
  /// Debounce function calls for better performance
  static Function debounce(Function func, Duration delay) {
    Timer? timer;
    return () {
      timer?.cancel();
      timer = Timer(delay, () => func());
    };
  }
  
  /// Throttle function calls
  static Function throttle(Function func, Duration delay) {
    bool isThrottled = false;
    return () {
      if (!isThrottled) {
        func();
        isThrottled = true;
        Timer(delay, () => isThrottled = false);
      }
    };
  }
  
  /// Schedule frame-aligned callback for smooth animations
  static void scheduleFrameCallback(VoidCallback callback) {
    SchedulerBinding.instance.scheduleFrameCallback((_) {
      callback();
    });
  }
  
  /// Get optimal animation curves for different refresh rates
  static Curve getOptimizedCurve({
    Curve baseIf60Hz = Curves.easeOutCubic,
    Curve? baseIf120Hz,
  }) {
    final refreshRate = _getDeviceRefreshRate();
    
    if (refreshRate > 60 && baseIf120Hz != null) {
      return baseIf120Hz;
    }
    
    return baseIf60Hz;
  }
  
  /// Performance-optimized shadow for cards
  static List<BoxShadow> getOptimizedShadow({
    required Color color,
    double blurRadius = 10,
    Offset offset = const Offset(0, 4),
    bool highPerformance = true,
  }) {
    if (highPerformance) {
      // Single shadow for better performance
      return [
        BoxShadow(
          color: color.withOpacity(0.1),
          blurRadius: blurRadius,
          offset: offset,
        ),
      ];
    } else {
      // Multiple shadows for better visual quality
      return [
        BoxShadow(
          color: color.withOpacity(0.05),
          blurRadius: blurRadius * 0.5,
          offset: offset * 0.5,
        ),
        BoxShadow(
          color: color.withOpacity(0.1),
          blurRadius: blurRadius,
          offset: offset,
        ),
      ];
    }
  }
}

/// Widget that only rebuilds when necessary for better performance
class OptimizedBuilder extends StatefulWidget {
  final Widget Function(BuildContext context) builder;
  final List<dynamic> dependencies;
  
  const OptimizedBuilder({
    Key? key,
    required this.builder,
    this.dependencies = const [],
  }) : super(key: key);
  
  @override
  State<OptimizedBuilder> createState() => _OptimizedBuilderState();
}

class _OptimizedBuilderState extends State<OptimizedBuilder> {
  late List<dynamic> _lastDependencies;
  
  @override
  void initState() {
    super.initState();
    _lastDependencies = List.from(widget.dependencies);
  }
  
  @override
  void didUpdateWidget(OptimizedBuilder oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    bool shouldRebuild = false;
    if (widget.dependencies.length != _lastDependencies.length) {
      shouldRebuild = true;
    } else {
      for (int i = 0; i < widget.dependencies.length; i++) {
        if (widget.dependencies[i] != _lastDependencies[i]) {
          shouldRebuild = true;
          break;
        }
      }
    }
    
    if (shouldRebuild) {
      _lastDependencies = List.from(widget.dependencies);
      setState(() {});
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return widget.builder(context);
  }
}
