import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";

import { formatAgeRange, formatDateRange, formatPrice } from "../format";
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
  const dates = formatDateRange(activity.startDate, activity.endDate);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{activity.title}</Text>
      {activity.description ? (
        <Text style={styles.description}>{activity.description}</Text>
      ) : null}

      <DetailRow
        label="Ages"
        value={formatAgeRange(activity.minAge, activity.maxAge)}
      />
      {activity.schedule.length > 0 ? (
        <DetailRow label="Schedule" value={activity.schedule.join(", ")} />
      ) : null}
      <DetailRow label="Price" value={formatPrice(activity.price)} />
      {dates ? <DetailRow label="Dates" value={dates} /> : null}
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