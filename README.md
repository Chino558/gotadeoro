# La Gota de Oro - Flutter App

This is a Flutter port of the Expo React Native app for La Gota de Oro restaurant.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd C:\Users\Anaxagoras\Documents\expo\gotaflutter
   flutter pub get
   ```

2. **Run the App**
   ```bash
   flutter run
   ```

## Features Implemented

- ✅ Home screen with menu grid
- ✅ Table tabs with editable names
- ✅ Menu items with quantity controls
- ✅ Order summary with total calculation
- ✅ Clear all modal
- ✅ Password modal for sales history
- ✅ Basic navigation structure
- ✅ State management with Provider
- ✅ Persistent storage for table names
- ✅ Animations with flutter_animate
- ✅ Haptic feedback

## Screens Created

1. **Home Screen** - Main menu with table selection
2. **Bill Screen** - Placeholder for bill details
3. **Sales History Screen** - Placeholder for sales history
4. **Weight Calculator Screen** - Placeholder for barbacoa calculator

## Key Differences from Expo Version

- Uses Provider instead of React hooks for state management
- Uses SharedPreferences instead of AsyncStorage
- Uses flutter_vibrate instead of expo-haptics
- Material Design components instead of React Native components
- Dart language instead of TypeScript/JavaScript

## TODO

- Implement full Bill screen functionality
- Implement Sales History with charts
- Implement Weight Calculator
- Add Supabase integration
- Add network connectivity handling
- Complete all screen implementations

## Architecture

```
lib/
├── main.dart                 # App entry point
├── screens/                  # Screen components
│   ├── home_screen.dart
│   ├── bill_screen.dart
│   ├── sales_history_screen.dart
│   └── weight_calculator_screen.dart
├── widgets/                  # Reusable widgets
│   ├── table_tabs.dart
│   ├── menu_item.dart
│   ├── enhanced_order_summary.dart
│   ├── clear_all_modal.dart
│   └── password_modal.dart
├── providers/               # State management
│   └── order_provider.dart
├── models/                  # Data models
│   └── order_item.dart
├── services/               # Services
│   ├── table_names_service.dart
│   └── storage_service.dart
├── data/                   # Static data
│   └── menu_items.dart
└── theme/                  # Theme configuration
    └── app_colors.dart
```
