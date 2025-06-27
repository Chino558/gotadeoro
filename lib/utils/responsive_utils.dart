import 'package:flutter/material.dart';

/// Responsive breakpoints for the Gota de Oro app
class ResponsiveBreakpoints {
  static const double small = 600;   // Mobile phones
  static const double medium = 900;  // Tablets portrait
  static const double large = 1200;  // Tablets landscape, desktops
}

/// Helper class to get responsive values based on screen size
class ResponsiveUtils {
  static bool isSmallScreen(BuildContext context) {
    return MediaQuery.of(context).size.width < ResponsiveBreakpoints.small;
  }

  static bool isMediumScreen(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= ResponsiveBreakpoints.small && width < ResponsiveBreakpoints.medium;
  }

  static bool isLargeScreen(BuildContext context) {
    return MediaQuery.of(context).size.width >= ResponsiveBreakpoints.medium;
  }

  /// Get number of grid columns based on screen width
  static int getGridColumns(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < ResponsiveBreakpoints.small) {
      return 3; // Small screens: 3 columns
    } else if (width < ResponsiveBreakpoints.medium) {
      return 4; // Medium screens: 4 columns
    } else if (width < ResponsiveBreakpoints.large) {
      return 5; // Large screens: 5 columns
    } else {
      return 6; // Extra large screens: 6 columns
    }
  }

  /// Get responsive font size
  static double getResponsiveFontSize(BuildContext context, double baseSize) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < ResponsiveBreakpoints.small) {
      return baseSize;
    } else if (width < ResponsiveBreakpoints.medium) {
      return baseSize * 1.1;
    } else {
      return baseSize * 1.2;
    }
  }

  /// Get maximum card width to prevent cards from becoming too large
  static double getMaxCardWidth(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < ResponsiveBreakpoints.small) {
      return double.infinity; // No max width on small screens
    } else if (width < ResponsiveBreakpoints.medium) {
      return 200; // Max 200px on medium screens
    } else {
      return 250; // Max 250px on large screens
    }
  }

  /// Get responsive padding
  static EdgeInsets getResponsivePadding(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < ResponsiveBreakpoints.small) {
      return const EdgeInsets.all(8);
    } else if (width < ResponsiveBreakpoints.medium) {
      return const EdgeInsets.all(12);
    } else {
      return const EdgeInsets.all(16);
    }
  }
}

/// Responsive builder widget that rebuilds when screen size changes
class ResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext, BoxConstraints) builder;

  const ResponsiveBuilder({
    Key? key,
    required this.builder,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: builder);
  }
}
