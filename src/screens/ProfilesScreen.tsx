import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { Icon } from '../components/Icon';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProfileEditor } from '../components/ProfileEditor';
import { Screen } from '../components/Screen';
import { useApp } from '../state/AppProvider';
import { type Profile } from '../state/profiles';
import { font, hitTarget, palette, radius, shadow, space } from '../theme/tokens';

/**
 * Manage who plays.
 *
 * Reached only through the parent gate (same as Parent Zone) — a child
 * should never be able to hand themselves an adult's profile, an older
 * sibling's, or create a new one, without a grown-up saying so.
 */
export function ProfilesScreen({ onClose }: { readonly onClose: () => void }) {
  const { profiles, activeProfile, switchActiveProfile, addProfile, updateProfileInfo, removeProfileById } =
    useApp();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const editing = profiles.find((p) => p.id === editingId) ?? null;
  const removing = profiles.find((p) => p.id === removingId) ?? null;
  const canRemove = profiles.length > 1;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail">
          Profiles
        </Text>
        <BigButton label="Done" onPress={onClose} tone="quiet" style={styles.done} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            isActive={profile.id === activeProfile?.id}
            onSwitch={() => switchActiveProfile(profile.id)}
            onEdit={() => setEditingId(profile.id)}
            onRemove={canRemove ? () => setRemovingId(profile.id) : undefined}
          />
        ))}

        {editing ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Edit {editing.name}</Text>
            <ProfileEditor
              initial={editing}
              saveLabel="Save changes"
              onSave={(input) => {
                updateProfileInfo(editing.id, input);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          </View>
        ) : null}

        {adding ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a profile</Text>
            <ProfileEditor
              saveLabel="Add profile"
              onSave={(input) => {
                addProfile(input);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </View>
        ) : (
          <BigButton label="Add profile" icon="plus" tone="quiet" onPress={() => setAdding(true)} />
        )}
      </ScrollView>

      <ConfirmModal
        visible={removing != null}
        title={removing ? `Remove ${removing.name}?` : ''}
        body="Their stars, levels, and settings on this device will be deleted. This cannot be undone."
        confirmLabel="Remove"
        confirmColor={palette.berry}
        onConfirm={() => {
          if (removing) removeProfileById(removing.id);
          setRemovingId(null);
        }}
        onCancel={() => setRemovingId(null)}
      />
    </Screen>
  );
}

function ProfileRow({
  profile,
  isActive,
  onSwitch,
  onEdit,
  onRemove,
}: {
  readonly profile: Profile;
  readonly isActive: boolean;
  readonly onSwitch: () => void;
  readonly onEdit: () => void;
  readonly onRemove?: () => void;
}) {
  return (
    <View style={[styles.row, isActive && styles.rowActive]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${profile.name}, age ${profile.age}${isActive ? ', current profile' : ''}`}
        onPress={onSwitch}
        style={styles.rowMain}
      >
        <Avatar name={profile.name} color={profile.avatar} size={44} />
        <View style={styles.rowText}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.caption}>Age {profile.age}</Text>
        </View>
        {isActive ? <Text style={styles.currentBadge}>Current</Text> : null}
      </Pressable>

      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${profile.name}`}
          onPress={onEdit}
          hitSlop={8}
          style={styles.actionButton}
        >
          <Icon name="pencil" size={20} color={palette.ink} />
        </Pressable>
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${profile.name}`}
            onPress={onRemove}
            hitSlop={8}
            style={styles.actionButton}
          >
            <Icon name="trash" size={20} color={palette.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  title: { flex: 1, flexShrink: 1, fontSize: font.title - 8, fontWeight: '800', color: palette.ink },
  done: { paddingHorizontal: space.md, marginLeft: space.sm },
  body: { paddingBottom: space.xxl, gap: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: space.md,
    borderWidth: 2,
    borderColor: palette.border,
    ...shadow,
  },
  rowActive: { borderColor: palette.sky },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: hitTarget },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: font.body, fontWeight: '800', color: palette.ink },
  caption: { fontSize: font.body - 3, color: palette.inkSoft },
  currentBadge: {
    fontSize: font.body - 4,
    fontWeight: '800',
    color: palette.sky,
    borderWidth: 2,
    borderColor: palette.sky,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  rowActions: { flexDirection: 'row', gap: space.xs },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: space.md,
    ...shadow,
  },
  cardTitle: { fontSize: font.body, fontWeight: '800', color: palette.ink },
});
