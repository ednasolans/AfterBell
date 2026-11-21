import { type ReactElement, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type ListStateViewProps = {
  // The header of the list, kept while it loads or fails so it does not jump
  header?: ReactElement;
  children: ReactNode;
};

// The loading or error view of a list, under the header of that list
export function ListStateView({
  header,
  children,
}: Readonly<ListStateViewProps>) {
  return (
    <View style={styles.container}>
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // The same side padding as the content of the lists
  container: { flex: 1, paddingHorizontal: 16 },
});
