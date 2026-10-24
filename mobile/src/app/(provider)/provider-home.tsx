import { Link } from "expo-router";
import { Text, View } from "react-native";
import LogoutButton from "@/components/LogoutButton";

export default function ProviderHomeScreen() {
  return (
    <View>
      <Text>Provider home</Text>
      <LogoutButton />
      <Link href="/activities">My activities</Link>
      <Link href="/activities">My activities</Link>
      <Link href="/ai-profile">AI profile</Link>
    </View>
  );
}
