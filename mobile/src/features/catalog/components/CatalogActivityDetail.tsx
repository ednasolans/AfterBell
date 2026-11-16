import { type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { categoryLabel } from "@/lib/activityCategories";
import { LoadingView } from "@/components/LoadingView";
import { isFinished } from "@/lib/activity";
import { colors } from "@/theme/colors";

import {
  formatActivityPrice,
  formatAgeRanges,
  formatDateRange,
} from "../format";
import { useCatalogActivity } from "../hooks/useCatalogActivity";
import { type CatalogActivityDetail as Detail } from "../types";
import { FavouriteButton } from "./FavouriteButton";

type DetailRowProps = { label: string; value: string };

function DetailRow({ label, value }: Readonly<DetailRowProps>) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

type CatalogActivityDetailProps = {
  id: string;
  // Extra content under the activity, e.g. the enrolment request (another feature)
  renderFooter?: (detail: Detail) => ReactNode;
};

export function CatalogActivityDetail({
  id,
  renderFooter,
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

  const { activity, isFavourite } = query.data;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{activity.title}</Text>
        <FavouriteButton
          activityId={activity.id}
          activityTitle={activity.title}
          isFavourite={isFavourite}
        />
      </View>
      {activity.description ? (
        <Text style={styles.description}>{activity.description}</Text>
      ) : null}

      <ActivityFacts detail={query.data} />
      <ProviderSection provider={query.data.provider} />

      {renderFooter?.(query.data)}
    </ScrollView>
  );
}

// Type, dates, ages, schedule, price, category, address and places
function ActivityFacts({ detail }: Readonly<{ detail: Detail }>) {
  const { activity, address, enrolledCount } = detail;
  const dates = formatDateRange(activity.startDate, activity.endDate);
  return (
    <>
      {activity.type === "temporary" ? (
        <Text style={styles.typeLabel}>Temporary activity</Text>
      ) : null}
      {isFinished(activity) ? (
        <Text style={styles.finished}>This activity has finished</Text>
      ) : null}
      {dates ? <DetailRow label="Dates" value={dates} /> : null}

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
      <DetailRow label="Category" value={categoryLabel(activity.category)} />
      {address ? <DetailRow label="Address" value={address} /> : null}
      {enrolledCount === null ? null : (
        <EnrolmentRows
          enrolledCount={enrolledCount}
          maxParticipants={activity.maxParticipants}
        />
      )}
    </>
  );
}

type EnrolmentRowsProps = {
  enrolledCount: number;
  maxParticipants: number | null;
};

// "Enrolled: 3 of 10" and "Places left: 7", or "3 (no limit)"
function EnrolmentRows({
  enrolledCount,
  maxParticipants,
}: Readonly<EnrolmentRowsProps>) {
  if (maxParticipants === null) {
    return <DetailRow label="Enrolled" value={`${enrolledCount} (no limit)`} />;
  }
  return (
    <>
      <DetailRow
        label="Enrolled"
        value={`${enrolledCount} of ${maxParticipants}`}
      />
      <DetailRow
        label="Places left"
        value={String(Math.max(0, maxParticipants - enrolledCount))}
      />
    </>
  );
}

// The approved profile of the provider and its contact details
function ProviderSection({
  provider,
}: Readonly<{ provider: Detail["provider"] }>) {
  const { contact } = provider;
  return (
    <>
      <Text style={styles.sectionTitle}>Provider</Text>
      {contact ? <Text style={styles.providerName}>{contact.name}</Text> : null}
      <Text style={styles.headline}>{provider.headline}</Text>
      <Text style={styles.description}>{provider.description}</Text>
      {contact?.email ? (
        <DetailRow label="Email" value={contact.email} />
      ) : null}
      {contact?.phoneNumber ? (
        <DetailRow label="Phone" value={contact.phoneNumber} />
      ) : null}
      {contact?.website ? (
        <DetailRow label="Website" value={contact.website} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, backgroundColor: colors.background },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { flex: 1, fontSize: 26, fontWeight: "800", color: colors.text },
  description: { color: colors.textMuted, marginBottom: 8, lineHeight: 22 },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeLabel: { fontWeight: "700", color: colors.primaryDark },
  finished: { fontWeight: "700", color: colors.danger },
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
