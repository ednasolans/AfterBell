import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function ProviderHomeScreen() {
  return (
    <View>
      <Text>Provider home</Text>
      {/* Temporary entry point until the activity list (#35) exists */}
      <Link href="/activities/new">New activity</Link>
    </View>
  );
}
