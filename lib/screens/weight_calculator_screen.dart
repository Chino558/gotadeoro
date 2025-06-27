import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_colors.dart';
import '../models/barbacoa_calculator.dart';
import '../models/calculator_settings.dart';
import '../utils/responsive_utils.dart';
import '../widgets/weight_button.dart';
import '../widgets/price_display.dart';
import '../widgets/settings_modal.dart';
import '../widgets/circular_weight_slider.dart';

class WeightCalculatorScreen extends StatefulWidget {
  const WeightCalculatorScreen({Key? key}) : super(key: key);

  @override
  State<WeightCalculatorScreen> createState() => _WeightCalculatorScreenState();
}

class _WeightCalculatorScreenState extends State<WeightCalculatorScreen>
    with TickerProviderStateMixin {
  // State variables
  double _selectedWeight = 250; // Default to 1/4 kilo
  final TextEditingController _customWeightController = TextEditingController();
  CalculatorSettings _settings = const CalculatorSettings();
  late BarbacoaCalculator _calculator;
  bool _isSliderMode = true; // Toggle between slider and buttons
  
  // Animation controllers
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  late AnimationController _switchController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _switchAnimation;
  
  // Preset weight options in grams
  final List<Map<String, dynamic>> _presetWeights = [
    {'label': '1/4 kg', 'value': 250.0},
    {'label': '1/2 kg', 'value': 500.0},
    {'label': '3/4 kg', 'value': 750.0},
    {'label': '1 kg', 'value': 1000.0},
  ];

  @override
  void initState() {
    super.initState();
    _calculator = BarbacoaCalculator(
      pricePerKilo: _settings.pricePerKilo,
      businessPhone: _settings.businessPhone,
      businessName: _settings.businessName,
    );
    
    // Initialize custom weight controller with current weight
    _customWeightController.text = _selectedWeight.toStringAsFixed(0);
    
    // Initialize animations
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _switchController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _scaleController,
      curve: Curves.easeInOut,
    ));
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeIn,
    ));
    
    _switchAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _switchController,
      curve: Curves.easeInOutCubic,
    ));
    
    _fadeController.forward();
    _switchController.forward();
  }

  @override
  void dispose() {
    _customWeightController.dispose();
    _scaleController.dispose();
    _fadeController.dispose();
    _switchController.dispose();
    super.dispose();
  }

  void _triggerHapticFeedback() {
    if (_settings.enableHaptics) {
      HapticFeedback.lightImpact();
    }
  }

  void _selectWeight(double weight) {
    setState(() {
      _selectedWeight = weight;
      _customWeightController.text = weight.toStringAsFixed(0);
    });
    _triggerHapticFeedback();
    
    if (_settings.enableAnimations) {
      _scaleController.forward().then((_) {
        _scaleController.reverse();
      });
    }
  }

  void _onCustomWeightChanged(String value) {
    if (value.isEmpty) return;
    
    final weight = double.tryParse(value);
    if (weight != null && weight > 0 && weight <= 2000) {
      setState(() {
        _selectedWeight = weight;
      });
    }
  }

  void _onSliderChanged(double value) {
    setState(() {
      _selectedWeight = value;
      _customWeightController.text = value.toStringAsFixed(0);
    });
    _triggerHapticFeedback();
  }

  void _toggleInputMode() {
    setState(() {
      _isSliderMode = !_isSliderMode;
    });
    _switchController.reset();
    _switchController.forward();
    _triggerHapticFeedback();
  }

  void _showSettingsModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SettingsModal(
        settings: _settings,
        onSettingsChanged: (newSettings) {
          setState(() {
            _settings = newSettings;
            _calculator = BarbacoaCalculator(
              pricePerKilo: newSettings.pricePerKilo,
              businessPhone: newSettings.businessPhone,
              businessName: newSettings.businessName,
            );
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final price = _calculator.calculatePrice(_selectedWeight);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Calculadora de Barbacoa',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 20,
          ),
        ),
        backgroundColor: AppColors.card,
        foregroundColor: AppColors.text,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: _showSettingsModal,
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Price Display
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: PriceDisplay(
                    price: price,
                    weight: _selectedWeight,
                    calculator: _calculator,
                  ),
                ),
                const SizedBox(height: 32),
                
                // Input Mode Toggle
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.cardLight,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildModeButton(
                          icon: Icons.speed,
                          label: 'Dial',
                          isSelected: _isSliderMode,
                          onTap: _isSliderMode ? null : _toggleInputMode,
                        ),
                        const SizedBox(width: 4),
                        _buildModeButton(
                          icon: Icons.grid_view_rounded,
                          label: 'Botones',
                          isSelected: !_isSliderMode,
                          onTap: !_isSliderMode ? null : _toggleInputMode,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Weight Selection Area
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  switchInCurve: Curves.easeInOut,
                  switchOutCurve: Curves.easeInOut,
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: ScaleTransition(
                        scale: animation,
                        child: child,
                      ),
                    );
                  },
                  child: _isSliderMode
                      ? _buildSliderMode()
                      : _buildButtonMode(),
                ),
                const SizedBox(height: 24),
                
                // Custom weight input
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.borderLight,
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.edit_outlined,
                            color: AppColors.primary,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Peso personalizado (gramos):',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _customWeightController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(
                            RegExp(r'^\d*\.?\d*'),
                          ),
                        ],
                        onChanged: _onCustomWeightChanged,
                        decoration: InputDecoration(
                          hintText: 'Ej: 350',
                          suffixText: 'gramos',
                          filled: true,
                          fillColor: AppColors.cardLight,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: AppColors.primary,
                              width: 2,
                            ),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
  Widget _buildModeButton({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(25),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : AppColors.textLight,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : AppColors.textLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderMode() {
    return Column(
      key: const ValueKey('slider'),
      children: [
        const Text(
          'Arrastra para seleccionar el peso:',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppColors.textLight,
          ),
        ),
        const SizedBox(height: 24),
        Center(
          child: CircularWeightSlider(
            value: _selectedWeight,
            minValue: 0,
            maxValue: 2000,
            onChanged: _onSliderChanged,
            onChangeStart: () {
              if (_settings.enableAnimations) {
                _scaleController.forward();
              }
              _triggerHapticFeedback();
            },
            onChangeEnd: () {
              if (_settings.enableAnimations) {
                _scaleController.reverse();
              }
            },
          ),
        ),
        const SizedBox(height: 24),
        // Quick preset buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: _presetWeights.map((weight) {
            final isSelected = _selectedWeight == weight['value'];
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: TextButton(
                onPressed: () => _selectWeight(weight['value']),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  backgroundColor: isSelected 
                      ? AppColors.primary.withOpacity(0.1)
                      : Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected 
                          ? AppColors.primary 
                          : AppColors.borderLight,
                      width: 1,
                    ),
                  ),
                ),
                child: Text(
                  weight['label'],
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? AppColors.primary : AppColors.textLight,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildButtonMode() {
    return Column(
      key: const ValueKey('buttons'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Selecciona el peso:',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppColors.textLight,
          ),
        ),
        const SizedBox(height: 16),
        // Weight buttons grid
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 3.2,
          children: _presetWeights.map((weight) {
            return WeightButton(
              label: weight['label'],
              isSelected: _selectedWeight == weight['value'],
              onTap: () => _selectWeight(weight['value']),
              enableAnimations: _settings.enableAnimations,
            );
          }).toList(),
        ),
      ],
    );
  }
}