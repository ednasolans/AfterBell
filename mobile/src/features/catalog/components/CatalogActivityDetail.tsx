import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activityCategories";
import { formatPriceRange } from "@/lib/price";
import { formatTimeSlot } from "@/lib/schedule";

import { ACTIVITY_TYPE_LABELS, formatAgeRanges } from "../format";
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
        label="Category"
        value={ACTIVITY_CATEGORY_LABELS[activity.category]}
      />
      <DetailRow label="Type" value={ACTIVITY_TYPE_LABELS[activity.type]} />
      <DetailRow
        label="Ages"
        value={formatAgeRanges(activity.targetAgeRanges)}
      />
      <DetailRow
        label="Schedule"
        value={activity.schedule.map(formatTimeSlot).join(", ")}
      />
      <DetailRow
        label="Price"
        value={formatPriceRange(
          activity.priceMin,
          activity.priceMax,
          activity.pricePeriod,
        )}
      />
      <DetailRow
        label="Capacity"
        value={`Up to ${activity.maxParticipants} people`}
      />
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
  container: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  description: { color: "#444", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
  label: { width: 90, fontWeight: "600" },
  value: { flex: 1, color: "#444" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  providerName: { fontSize: 16, fontWeight: "600" },
  headline: { fontWeight: "600", color: "#2563eb" },
  notFound: { textAlign: "center", color: "#888", marginTop: 24 },
});