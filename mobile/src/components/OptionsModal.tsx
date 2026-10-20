import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface OptionsModalProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly SelectOption<T>[];
  isSelected: (value: T) => boolean;
  onPressOption: (value: T) => void;
  onClose: () => void;
  // Several options can be selected: options behave as checkboxes and a Done button closes the list
  multiple?: boolean;
}

export function OptionsModal<T extends string>({
  visible,
  title,
  options,
  isSelected,
  onPressOption,
  onClose,
  multiple = false,
}: OptionsModalProps<T>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Catches touches inside the sheet so they do not reach the backdrop and close it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.optionsList}>
            {options.map((option) => {
              const selected = isSelected(option.value);

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    selected ? styles.optionSelected : null,
                  ]}
                  onPress={() => onPressOption(option.value)}
                  accessibilityRole={multiple ? "checkbox" : "radio"}
                  accessibilityState={
                    multiple ? { checked: selected } : { selected }
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected ? styles.optionTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color="#0f766e" />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {multiple ? (
            <Pressable
              style={styles.doneButton}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 8 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionSelected: { backgroundColor: "#e6f4f2" },
  optionText: { fontSize: 16 },
  optionTextSelected: { fontWeight: "600", color: "#0f766e" },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  doneText: { fontSize: 16, fontWeight: "600", color: "#0f766e" },
  optionsList: { maxHeight: 400 },
});
