import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class SuccessOverlay extends StatelessWidget {
  final String message;
  final VoidCallback? onComplete;

  const SuccessOverlay({
    Key? key,
    this.message = 'Venta guardada',
    this.onComplete,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Auto dismiss after animation
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (onComplete != null) {
        onComplete!();
      }
    });

    return Container(
      color: Colors.black54,
      child: Center(
        child: Container(
          width: 200,
          height: 200,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check,
                  size: 50,
                  color: Colors.green,
                ),
              )
                  .animate()
                  .scale(delay: 100.ms, duration: 300.ms, curve: Curves.elasticOut),
              const SizedBox(height: 20),
              Text(
                message,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(duration: 200.ms)
            .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack),
      ),
    );
  }
}
