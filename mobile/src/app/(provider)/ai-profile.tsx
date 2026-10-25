import { ScrollView, StyleSheet } from "react-native";

import { AiProfile } from "@/features/ai-profile/components/AiProfile";

export default function AiProfileScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <AiProfile />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
});
