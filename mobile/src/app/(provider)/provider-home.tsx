import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function ProviderHomeScreen() {
  return (
    <View>
      <Text>Provider home</Text>
      <Link href="/activities">My activities</Link>
    </View>
  );
}
