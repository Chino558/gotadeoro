import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class WeightButton extends StatefulWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final bool enableAnimations;

  const WeightButton({
    Key? key,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.enableAnimations = true,
  }) : super(key: key);

  @override
  State<WeightButton> createState() => _WeightButtonState();
}

class _WeightButtonState extends State<WeightButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (widget.enableAnimations) {
      _controller.forward().then((_) {
        _controller.reverse();
      });
    }
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTap,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          decoration: BoxDecoration(
            color: widget.isSelected ? AppColors.primary : AppColors.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: widget.isSelected 
                  ? AppColors.primary 
                  : AppColors.borderLight,
              width: widget.isSelected ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Center(
            child: Text(
              widget.label,
              style: TextStyle(
                color: widget.isSelected ? AppColors.card : AppColors.text,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
