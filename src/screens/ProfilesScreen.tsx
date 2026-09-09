import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { ConfirmModal } from '../components/ConfirmModal';
import { Icon } from '../components/Icon';
import { ProfileEditor } from '../components/ProfileEditor';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { useApp } from '../state/AppProvider';
import { type Profile } from '../state/profiles';
import { gutter, hitTarget, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';

/**
 * Manage who plays.
 *
 * Reached only through the parent gate (same as Parent Zone) — a child
 * should never be able to hand themselves an adult's profile, an older
 * sibling's, or create a new one, without a grown-up saying so.
 */
export function ProfilesScreen({ onClose }: { readonly onClose: () => void }) {
  const {
    profiles,
    activeProfile,
    switchActiveProfile,
    addProfile,
    updateProfileInfo,
    removeProfileById,
  } = useApp();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const editing = profiles.find((p) => p.id === editingId) ?? null;
  const removing = profiles.find((p) => p.id === removingId) ?? null;
  const canRemove = profiles.length > 1;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={type.mono}>GROWN-UPS ONLY</Text>
          <Text style={type.h3} accessibilityRole="header">
            PROFILES
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={onClose}
          style={({ pressed }) => [styles.done, pressed && styles.pressedTint]}
        >
          <Text style={type.monoStrong}>DONE</Text>
        </Pressable>
      </View>
      <Rule weight="major" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionHeader label="ON THIS DEVICE" meta={`${profiles.length}`} />
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
        <Rule weight="major" />

        {editing ? (
          <>
            <SectionHeader label={`EDIT ${editing.name.toUpperCase()}`} />
            <View style={styles.block}>
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
          </>
        ) : null}

        {adding ? (
          <>
            <SectionHeader label="ADD A PROFILE" />
            <View style={styles.block}>
              <ProfileEditor
                saveLabel="Add profile"
                onSave={(input) => {
                  addProfile(input);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </View>
          </>
        ) : (
          <View style={styles.block}>
            <BigButton
              label="Add profile"
              icon="plus"
              tone="quiet"
              onPress={() => setAdding(true)}
            />
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={removing != null}
        title={removing ? `Remove ${removing.name}?` : ''}
        body="Their stars, levels, and settings on this device will be deleted. This cannot be undone."
        confirmLabel="Remove"
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
    <View style={styles.row}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${profile.name}, age ${profile.age}${isActive ? ', current profile' : ''}`}
        onPress={onSwitch}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressedTint]}
      >
        <Avatar name={profile.name} color={profile.avatar} size={44} />
        <View style={styles.rowText}>
          <Text style={type.rowTitle}>{profile.name}</Text>
          <Text style={type.monoSm}>
            {profile.age} YRS{isActive ? ' · PLAYING NOW' : ''}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${profile.name}`}
        onPress={onEdit}
        style={({ pressed }) => [styles.action, pressed && styles.pressedTint]}
      >
        <Icon name="pencil" size={18} color={palette.ink} />
      </Pressable>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${profile.name}`}
          onPress={onRemove}
          style={({ pressed }) => [styles.action, pressed && styles.pressedTint]}
        >
          <Icon name="trash" size={18} color={palette.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: gutter,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerText: { gap: space.xs },
  done: {
    minHeight: hitTarget,
    paddingHorizontal: gutter,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: rule.hair,
    borderLeftColor: palette.border,
  },
  scroll: { paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: hitTarget,
    borderTopWidth: rule.hair,
    borderTopColor: palette.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: space.md,
  },
  rowText: { flex: 1, gap: 2 },
  action: {
    width: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: rule.hair,
    borderLeftColor: palette.border,
  },
  pressedTint: { backgroundColor: 'rgba(32,30,29,0.10)' },
  block: { paddingHorizontal: gutter, paddingBottom: space.lg },
});
