import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { OrderSummary } from '../components/OrderSummary';
import { BillBreakdown } from '../components/BillBreakdown';
import { MenuItem } from '../components/MenuItem';
import { TableTabs } from '../components/TableTabs';
import { menuItems } from '../data/menuItems';
import { COLORS } from '../theme';

// ... rest of the code ...