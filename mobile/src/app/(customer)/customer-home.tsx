import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import LogoutButton from "@/components/LogoutButton";
import { CatalogList } from "@/features/catalog/components/CatalogList";

// Home of the customer area: the list of activities
export default function CustomerHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CatalogList
        onOpen={(id) =>
          router.push({ pathname: "/activities/[id]", params: { id } })
        }
      />
      <View style={styles.footer}>
        <LogoutButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingBottom: 16 },
});