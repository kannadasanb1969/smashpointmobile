import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

const STEPS: { step: number; label: string }[] = [
  { step: 1, label: 'Event' },
  { step: 2, label: 'Details' },
  { step: 3, label: 'Confirm' },
];

// Purely presentational — `currentStep` reflects where this screen sits in the existing
// category -> (partner) -> confirm navigation flow, not a new piece of business state.
export function RegistrationStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <View style={s.row}>
      {STEPS.map((item, index) => (
        <View key={item.step} style={s.stepBlock}>
          {index > 0 && <View style={[s.connector, item.step <= currentStep && s.connectorActive]} />}
          <View style={s.stepColumn}>
            <View style={[s.circle, item.step === currentStep && s.circleCurrent, item.step < currentStep && s.circleDone]}>
              <Text style={[s.circleText, item.step === currentStep && s.circleTextCurrent]}>{item.step}</Text>
            </View>
            <Text style={[s.label, item.step === currentStep && s.labelCurrent]}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepBlock: { flexDirection: 'row', alignItems: 'center', flex: 1, maxWidth: 92 },
  connector: { flex: 1, height: 1, backgroundColor: '#2E6C56', marginBottom: 20 },
  connectorActive: { backgroundColor: colors.lime },
  stepColumn: { alignItems: 'center', flex: 1 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2E6C56',
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { borderColor: colors.lime },
  circleCurrent: { backgroundColor: colors.lime, borderColor: colors.lime },
  circleText: { color: '#8FA59B', fontWeight: '900', fontSize: 13 },
  circleTextCurrent: { color: '#0B3324' },
  label: { color: '#8FA59B', fontSize: 11, fontWeight: '700', marginTop: 6 },
  labelCurrent: { color: colors.lime },
});
