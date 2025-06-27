import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../models/calculator_settings.dart';

class SettingsModal extends StatefulWidget {
  final CalculatorSettings settings;
  final Function(CalculatorSettings) onSettingsChanged;

  const SettingsModal({
    Key? key,
    required this.settings,
    required this.onSettingsChanged,
  }) : super(key: key);

  @override
  State<SettingsModal> createState() => _SettingsModalState();
}

class _SettingsModalState extends State<SettingsModal> {
  late TextEditingController _priceController;
  late TextEditingController _phoneController;
  late TextEditingController _businessNameController;
  late bool _enableHaptics;
  late bool _enableAnimations;

  @override
  void initState() {
    super.initState();
    _priceController = TextEditingController(
      text: widget.settings.pricePerKilo.toString(),
    );
    _phoneController = TextEditingController(
      text: widget.settings.businessPhone,
    );
    _businessNameController = TextEditingController(
      text: widget.settings.businessName,
    );
    _enableHaptics = widget.settings.enableHaptics;
    _enableAnimations = widget.settings.enableAnimations;
  }

  @override
  void dispose() {
    _priceController.dispose();
    _phoneController.dispose();
    _businessNameController.dispose();
    super.dispose();
  }

  void _saveSettings() {
    final price = double.tryParse(_priceController.text) ?? 650.0;
    final newSettings = widget.settings.copyWith(
      pricePerKilo: price,
      businessPhone: _phoneController.text,
      businessName: _businessNameController.text,
      enableHaptics: _enableHaptics,
      enableAnimations: _enableAnimations,
    );
    widget.onSettingsChanged(newSettings);
    Navigator.of(context).pop();
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Title
            const Text(
              'Configuración',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 24),
            
            // Price per kilo input
            _buildTextField(
              controller: _priceController,
              label: 'Precio por kilo',
              hint: '650',
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                  RegExp(r'^\d*\.?\d*'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Phone number input
            _buildTextField(
              controller: _phoneController,
              label: 'Número de WhatsApp',
              hint: '+521234567890',
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 20),
            
            // Business name input
            _buildTextField(
              controller: _businessNameController,
              label: 'Nombre del negocio',
              hint: 'Barbacoa El Sabor',
            ),
            const SizedBox(height: 24),
            
            // Switches
            SwitchListTile(
              title: const Text('Vibración háptica'),
              subtitle: const Text('Activar retroalimentación táctil'),
              value: _enableHaptics,
              onChanged: (value) {
                setState(() {
                  _enableHaptics = value;
                });
              },
              activeColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            SwitchListTile(
              title: const Text('Animaciones'),
              subtitle: const Text('Activar efectos visuales'),
              value: _enableAnimations,
              onChanged: (value) {
                setState(() {
                  _enableAnimations = value;
                });
              },
              activeColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 32),
            
            // Save button
            ElevatedButton(
              onPressed: _saveSettings,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.card,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
              ),
              child: const Text(
                'Guardar cambios',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
