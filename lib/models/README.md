# Barbacoa Calculator App

## Overview
Enhanced barbacoa calculator app built with Flutter that provides real-time price calculations and WhatsApp integration for easy customer communication.

## Features

### Core Calculator
- **Price per kilo**: $650 MXN (modifiable through settings)
- **Pre-set weight buttons**: 
  - 1/4 kilo (250g)
  - 1/2 kilo (500g)
  - 3/4 kilo (750g)
  - 1 kilo (1000g)
- **Custom weight input**: Enter any weight in grams
- **Real-time price calculation**: Updates instantly as you select or enter weights
- **Beautiful animations**: Smooth transitions and visual feedback

### WhatsApp Integration
- **One-tap sharing**: Send order details directly to WhatsApp
- **Smart message formatting**: Includes weight, price, and business info
- **Cross-platform support**: Works with WhatsApp mobile app and web
- **Error handling**: Graceful fallback when WhatsApp isn't installed

### Advanced Features
- **Long press settings**: Hold WhatsApp button for 4+ seconds to access settings
- **Customizable business info**: 
  - Business phone number
  - Business name
  - Price per kilo
- **User preferences**:
  - Toggle haptic feedback
  - Enable/disable animations
- **Responsive design**: Adapts to different screen sizes
- **Professional UI**: Modern, clean interface with smooth animations

## File Structure

```
lib/
├── models/
│   ├── barbacoa_calculator.dart    # Core calculator logic
│   ├── calculator_settings.dart    # Settings management
│   └── models.dart                 # Export file
├── screens/
│   └── weight_calculator_screen.dart # Main calculator screen
└── widgets/
    ├── weight_button.dart          # Weight selection buttons
    ├── price_display.dart          # Price display component
    └── settings_modal.dart         # Settings configuration modal
```

## Usage

1. **Select Weight**: Tap one of the preset weight buttons or enter a custom weight
2. **View Price**: The total price updates automatically based on selected weight
3. **Share via WhatsApp**: Tap the WhatsApp button to send order details
4. **Configure Settings**: Long press (4+ seconds) the WhatsApp button to:
   - Change price per kilo
   - Update business phone number
   - Modify business name
   - Toggle haptic feedback
   - Enable/disable animations

## Technical Details

### Dependencies
- `url_launcher`: For WhatsApp integration
- Flutter SDK: Built-in animations and haptic feedback

### State Management
- Uses StatefulWidget for local state management
- Settings are stored in memory (can be extended to use SharedPreferences)

### Key Components
1. **BarbacoaCalculator**: Handles price calculations and formatting
2. **CalculatorSettings**: Manages user preferences
3. **WeightCalculatorScreen**: Main screen with all UI logic
4. **Custom Widgets**: Reusable components for consistent UI

## WhatsApp Message Format

```
¡Hola! 🌮
    
Me gustaría ordenar:
• Barbacoa: [weight]
• Total: $[price]

¿Está disponible para recoger?

Gracias,
[Business Name]
```

## Customization

The app can be easily customized by modifying:
- Default price in `BarbacoaCalculator`
- Color scheme in `AppColors`
- Preset weight options in `WeightCalculatorScreen`
- WhatsApp message template in `generateWhatsAppMessage()`

## Future Enhancements

Potential improvements:
- Persist settings using SharedPreferences
- Add order history
- Support multiple products
- Include delivery options
- Add payment integration
- Multi-language support
