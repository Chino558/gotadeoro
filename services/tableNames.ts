import AsyncStorage from '@react-native-async-storage/async-storage';

const TABLE_NAMES_KEY = '@table_names';

export interface TableNames {
  [key: number]: string;
}

export const saveTableName = async (tableNumber: number, name: string) => {
  try {
    const existingNames = await getTableNames();
    const updatedNames = { ...existingNames, [tableNumber]: name };
    await AsyncStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(updatedNames));
  } catch (error) {
    console.error('Error saving table name:', error);
  }
};

export const getTableNames = async (): Promise<TableNames> => {
  try {
    const names = await AsyncStorage.getItem(TABLE_NAMES_KEY);
    return names ? JSON.parse(names) : {};
  } catch (error) {
    console.error('Error getting table names:', error);
    return {};
  }
};