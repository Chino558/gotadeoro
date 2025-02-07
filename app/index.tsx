import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 20,
        letterSpacing: 2,
        textAlign: 'center',
      }}>Welcome to Appacella!</Text>
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
