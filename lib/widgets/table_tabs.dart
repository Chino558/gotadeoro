import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:convert';
import '../theme/app_colors.dart';
import '../services/haptic_service.dart';

class TableTabs extends StatefulWidget {
  final int currentTable;
  final Function(int) onTableChange;

  const TableTabs({
    Key? key,
    required this.currentTable,
    required this.onTableChange,
  }) : super(key: key);

  @override
  State<TableTabs> createState() => _TableTabsState();
}

class _TableTabsState extends State<TableTabs> {
  static const String tableNamesKey = 'table_names';
  static const Color orangeActive = Color(0xFFF39C12);
  static const Color orangeDark = Color(0xFFE69500);
  static const Color editHighlightBorder = Color(0xFF00BCD4);
  static const Color editHighlightUnderline = Color(0xFF0097A7);
  static const Color cardBgInactive = Color(0xFFF8F9FA);
  static const Color cardTextInactive = Color(0xFF495057);

  Map<int, String> tableNames = {};
  int? editingTable;
  String newName = '';
  final TextEditingController _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTableNames();
  }

  @override
  void didUpdateWidget(TableTabs oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reload table names when widget updates (e.g., after reset)
    _loadTableNames();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _getDefaultName(int table) => 'Mesa $table';

  Future<void> _loadTableNames() async {
    final prefs = await SharedPreferences.getInstance();
    final namesJson = prefs.getString(tableNamesKey);
    
    Map<int, String> loadedNames = {};
    if (namesJson != null) {
      final decoded = Map<String, dynamic>.from(
        Map<String, dynamic>.from(
          json.decode(namesJson) as Map
        )
      );
      decoded.forEach((key, value) {
        loadedNames[int.parse(key)] = value.toString();
      });    }

    // Ensure default names exist
    final defaultNames = <int, String>{};
    for (int i = 1; i <= 4; i++) {
      if (!loadedNames.containsKey(i)) {
        defaultNames[i] = _getDefaultName(i);
      }
    }

    setState(() {
      tableNames = {...defaultNames, ...loadedNames};
    });
  }

  void _handleTablePress(int table) {
    if (editingTable == null) {
      HapticService.light();
      widget.onTableChange(table);
    }
  }

  void _handleTableLongPress(int table) {
    if (editingTable != null) return;
    
    HapticService.medium();
    setState(() {
      editingTable = table;
      newName = tableNames[table] ?? _getDefaultName(table);
      _controller.text = newName;
    });  }

  Future<void> _saveTableName(int table) async {
    String finalName = _controller.text.trim();
    if (finalName.isEmpty) {
      finalName = _getDefaultName(table);
    }

    if (finalName != (tableNames[table] ?? _getDefaultName(table))) {
      final updatedNames = {...tableNames, table: finalName};
      setState(() {
        tableNames = updatedNames;
      });

      try {
        final prefs = await SharedPreferences.getInstance();
        final encodedNames = <String, String>{};
        updatedNames.forEach((key, value) {
          encodedNames[key.toString()] = value;
        });
        await prefs.setString(tableNamesKey, json.encode(encodedNames));
        HapticService.success();
      } catch (error) {
        print('Error saving table name: $error');
        HapticService.error();
        setState(() {
          tableNames[table] = tableNames[table] ?? _getDefaultName(table);
        });
      }
    } else {
      HapticService.light();    }

    setState(() {
      editingTable = null;
      newName = '';
    });
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(
          bottom: BorderSide(
            color: AppColors.borderLight,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: List.generate(4, (index) {
          final table = index + 1;
          final isActive = widget.currentTable == table;
          final isEditingThis = editingTable == table;

          return Expanded(
            child: Container(
              margin: EdgeInsets.only(
                left: index == 0 ? 8 : 4,
                right: index == 3 ? 8 : 4,
              ),              child: GestureDetector(
                onTap: () => _handleTablePress(table),
                onLongPress: () => _handleTableLongPress(table),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeInOut,
                  transform: Matrix4.identity()
                    ..scale(isActive && !isEditingThis ? 1.02 : 1.0),
                  transformAlignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                  decoration: BoxDecoration(
                    color: isActive && !isEditingThis 
                        ? AppColors.primary
                        : isEditingThis 
                            ? Colors.white 
                            : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isEditingThis
                          ? editHighlightBorder
                          : isActive && !isEditingThis
                              ? Colors.black
                              : Colors.black.withOpacity(0.4),
                      width: isEditingThis ? 2 : 1.5,
                    ),
                    boxShadow: [
                      if (isActive && !isEditingThis) ...[
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          offset: const Offset(0, 2),
                          blurRadius: 4,
                        ),
                      ] else ...[
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          offset: const Offset(0, 1),
                          blurRadius: 2,
                        ),
                      ],
                    ],
                  ),
                  child: isEditingThis
                      ? TextField(
                          controller: _controller,
                          onSubmitted: (_) => _saveTableName(table),
                          textAlign: TextAlign.center,
                          autofocus: true,
                          maxLength: 100,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                            border: InputBorder.none,
                            counterText: '',
                            enabledBorder: UnderlineInputBorder(
                              borderSide: BorderSide(
                                color: editHighlightUnderline,
                                width: 2,
                              ),
                            ),
                            focusedBorder: UnderlineInputBorder(
                              borderSide: BorderSide(
                                color: editHighlightUnderline,
                                width: 2,
                              ),
                            ),
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.black,  // Always black text when editing
                          ),
                        )
                      : Text(
                          tableNames[table] ?? _getDefaultName(table),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                            color: isActive ? Colors.white : Colors.black.withOpacity(0.8),
                            letterSpacing: 0.2,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                          textAlign: TextAlign.center,
                        ),
                ),
              ).animate().fadeIn(
                duration: const Duration(milliseconds: 400),
                delay: Duration(milliseconds: index * 80),
              ),
            ),
          );
        }),
      ),
    );
  }
}
