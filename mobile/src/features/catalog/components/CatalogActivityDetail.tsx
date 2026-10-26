import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { formatAgeRanges, formatActivityPrice } from "../format";
import { useCatalogActivity } from "../hooks/useCatalogActivity";

type DetailRowProps = { label: string; value: string };

function DetailRow({ label, value }: Readonly<DetailRowProps>) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

type CatalogActivityDetailProps = { id: string };

export function CatalogActivityDetail({
  id,
}: Readonly<CatalogActivityDetailProps>) {
  const query = useCatalogActivity(id);

  if (query.isPending) {
    return <LoadingView />;
  }

  if (query.isError) {
    return (
      <ErrorView
        message="The activity could not be loaded."
        onRetry={() => query.refetch()}
      />
    );
  }

  if (!query.data) {
    return (
      <Text style={styles.notFound}>This activity is no longer available.</Text>
    );
  }

  const { activity, provider, address } = query.data;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{activity.title}</Text>
      {activity.description ? (
        <Text style={styles.description}>{activity.description}</Text>
      ) : null}

      <DetailRow
        label="Ages"
        value={formatAgeRanges(activity.targetAgeRanges)}
      />
      {activity.schedule.length > 0 ? (
        <DetailRow
          label="Schedule"
          value={activity.schedule
            .map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}`)
            .join(", ")}
        />
      ) : null}
      <DetailRow
        label="Price"
        value={formatActivityPrice(activity.price, activity.pricePeriod)}
      />
      <DetailRow label="Category" value={activity.category} />
      {address ? <DetailRow label="Address" value={address} /> : null}

      <Text style={styles.sectionTitle}>Provider</Text>
      {provider.contact ? (
        <Text style={styles.providerName}>{provider.contact.name}</Text>
      ) : null}
      <Text style={styles.headline}>{provider.headline}</Text>
      <Text style={styles.description}>{provider.description}</Text>
      {provider.contact?.email ? (
        <DetailRow label="Email" value={provider.contact.email} />
      ) : null}
      {provider.contact?.phoneNumber ? (
        <DetailRow label="Phone" value={provider.contact.phoneNumber} />
      ) : null}
      {provider.contact?.website ? (
        <DetailRow label="Website" value={provider.contact.website} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  description: { color: colors.textMuted, marginBottom: 8, lineHeight: 22 },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { width: 90, fontWeight: "700", color: colors.text },
  value: { flex: 1, color: colors.textMuted },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: 16,
  },
  providerName: { fontSize: 16, fontWeight: "700", color: colors.primaryDark },
  headline: { fontWeight: "700", color: colors.primaryDark },
  notFound: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
