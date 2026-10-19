import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Select, type SelectOption } from "@/components/Select";
import { TextField } from "@/components/TextField";
import {
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  addTimeSlot,
  buildTimeSlot,
  formatTimeSlot,
  removeTimeSlot,
  type TimeSlot,
  type WeekDay,
} from "@/lib/schedule";

// NEW: built once, outside the component, like the other option lists
const DAY_OPTIONS: SelectOption<WeekDay>[] = WEEK_DAYS.map((day) => ({
  value: day,
  label: WEEK_DAY_LABELS[day],
}));

type ScheduleEditorProps = {
  schedule: TimeSlot[];
  onChange: (schedule: TimeSlot[]) => void;
  error?: string;
};

export function ScheduleEditor({
  schedule,
  onChange,
  error,
}: ScheduleEditorProps) {
  // NEW: draft of the slot being added; it is not part of the form until "Add" is pressed
  const [day, setDay] = useState<WeekDay | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const newSlot = buildTimeSlot(day, startTime, endTime); // NEW
  const canAdd = newSlot !== null; // NEW

  // NEW
  function handleAdd() {
    if (newSlot === null) {
      return;
    }
    onChange(addTimeSlot(schedule, newSlot));
    setStartTime("");
    setEndTime("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Schedule</Text>

      {schedule.length === 0 ? (
        <Text style={styles.empty}>No time slots yet</Text>
      ) : (
        schedule.map((slot, index) => (
          <View
            key={`${slot.day}-${slot.startTime}-${index}`}
            style={styles.slotRow}
          >
            <Text style={styles.slotText}>{formatTimeSlot(slot)}</Text>
            <Pressable
              onPress={() => onChange(removeTimeSlot(schedule, index))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${formatTimeSlot(slot)}`}
              hitSlop={8}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* NEW: editor for a new slot */}
      <View style={styles.editor}>
        <Select
          label="Day"
          value={day}
          options={DAY_OPTIONS}
          onChange={setDay}
          placeholder="Choose a day"
        />

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <TextField
              label="Start"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.timeField}>
            <TextField
              label="End"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <Pressable
          onPress={handleAdd}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
        >
          <Text style={styles.addButtonText}>Add time slot</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  empty: {
    color: "#888",
    fontStyle: "italic",
  },
  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 6,
  },
  slotText: {
    fontSize: 15,
  },
  removeText: {
    fontSize: 16,
    color: "#c00",
  },
  error: {
    color: "#c00",
    fontSize: 12,
    marginTop: 4,
  },
  // NEW
  editor: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  addButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
