import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME, APP_VERSION, POLICY_DATE, PRIVACY_POLICY } from '../safety/privacyPolicy';
import { gutter, palette, rule, space } from '../theme/tokens';
import { type } from '../theme/type';
import { BigButton } from './BigButton';
import { Rule } from './Rule';

/**
 * The privacy policy, read in full inside the app — the stores ask for it
 * there as well as on the listing. Shown from Parent Zone, so it sits behind
 * the grown-ups' gate with everything else that isn't for the child. The
 * text is src/safety/privacyPolicy.ts, the same words as the web page.
 */
export function PolicySheet({ visible, onClose }: { readonly visible: boolean; readonly onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* A modal is its own root: it needs its own safe areas, clear of the
          notch and the home indicator. */}
      <SafeAreaProvider>
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.top}>
          <Text style={type.mono}>{`${APP_NAME.toUpperCase()} · VERSION ${APP_VERSION}`}</Text>
          <Text style={type.h2} accessibilityRole="header">
            Privacy policy
          </Text>
          <Text style={type.meta}>{`Dated ${POLICY_DATE}`}</Text>
        </View>
        <Rule weight="major" />
        <ScrollView contentContainerStyle={styles.body}>
          {PRIVACY_POLICY.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={type.rowTitle} accessibilityRole="header">
                {section.heading}
              </Text>
              {section.paragraphs.map((p) => (
                <Text key={p.slice(0, 32)} style={[type.body, styles.copy]}>
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
        <Rule weight="major" />
        <View style={styles.footer}>
          <BigButton label="Done" icon="check" onPress={onClose} />
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.bg },
  top: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.md, gap: space.xs },
  body: { padding: gutter, gap: space.lg },
  section: { gap: space.sm, paddingBottom: space.sm, borderBottomWidth: rule.hair, borderBottomColor: palette.border },
  copy: { color: palette.ink, maxWidth: 640 },
  footer: { padding: gutter },
});
