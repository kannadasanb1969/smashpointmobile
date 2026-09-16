import { SafeAreaView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'; import type { PropsWithChildren } from 'react'; import { colors, spacing } from '../../theme';
export function ScreenContainer({ children }: PropsWithChildren) { return <SafeAreaView style={styles.root}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS==='ios'?'padding':'height'}>{children}</KeyboardAvoidingView></SafeAreaView>; }
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.background,paddingHorizontal:spacing.md},keyboard:{flex:1}});
