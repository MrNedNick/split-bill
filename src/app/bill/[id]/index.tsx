import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native'
import { Body, Button, Card, Divider, EmptyState, Field, Label, Row, Screen, Title } from '../../../components/ui'
import { formatMoney, parseAmount } from '../../../lib/money'
import { settle } from '../../../lib/settle'
import { spacing, useTheme } from '../../../lib/theme'
import { useBills } from '../../../store/bills'

/** Alert is native-only; the web build gets the browser's own confirm. */
function confirmRemoval(name: string, itemCount: number, onConfirm: () => void) {
  const message =
    itemCount > 0
      ? `${name} is on ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. Removing them leaves those items split between whoever is left.`
      : `Remove ${name} from this bill?`

  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm()
    return
  }

  Alert.alert(`Remove ${name}?`, message, [
    { text: 'Keep', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ])
}

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colors = useTheme()
  const router = useRouter()

  const bill = useBills((state) => state.bills.find((item) => item.id === id))
  const hydrated = useBills((state) => state.hydrated)
  const { addParticipant, removeParticipant, addItem, removeItem, toggleSharer, removeBill } =
    useBills.getState()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)

  const settlement = useMemo(() => (bill ? settle(bill) : null), [bill])

  if (!hydrated) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <Body tone="soft">Opening the bill…</Body>
        </View>
      </Screen>
    )
  }

  if (!bill || !settlement) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="That bill is gone"
            hint="It may have been deleted on this device. The list of bills is still there."
            action={<Button title="Back to bills" onPress={() => router.replace('/')} />}
          />
        </View>
      </Screen>
    )
  }

  const submitItem = () => {
    const cents = parseAmount(amount)
    if (cents === null || cents === 0) {
      setAmountError('Enter a price, for example 12.50')
      return
    }
    setAmountError(null)
    addItem(bill.id, label, cents, [])
    setLabel('')
    setAmount('')
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: bill.title }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 }}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Title>Who was there</Title>
            <Body tone="soft">{bill.participants.length}</Body>
          </Row>

          {bill.participants.length === 0 ? (
            <Body tone="soft">Add the people first — items are split between them.</Body>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {bill.participants.map((person) => (
                <Row key={person.id} style={{ justifyContent: 'space-between' }}>
                  <Body>{person.name}</Body>
                  <Button
                    title="Remove"
                    variant="ghost"
                    compact
                    accessibilityLabel={`Remove ${person.name}`}
                    onPress={() =>
                      confirmRemoval(
                        person.name,
                        bill.items.filter((item) => item.sharedBy.includes(person.id)).length,
                        () => removeParticipant(bill.id, person.id),
                      )
                    }
                  />
                </Row>
              ))}
            </View>
          )}

          <Row>
            <Field
              label="Add a person"
              placeholder="Ada"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!name.trim()) return
                addParticipant(bill.id, name)
                setName('')
              }}
            />
            <Button
              title="Add"
              accessibilityLabel="Add person"
              compact
              style={{ marginTop: 18 }}
              onPress={() => {
                if (!name.trim()) return
                addParticipant(bill.id, name)
                setName('')
              }}
            />
          </Row>
        </Card>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Title>What was ordered</Title>
            <Body tone="soft">{formatMoney(settlement.subtotal)}</Body>
          </Row>

          {bill.items.length === 0 ? (
            <Body tone="soft">
              Nothing yet. Add a dish with its price, then tap the people who shared it — an item
              with nobody on it is split between everyone.
            </Body>
          ) : (
            <View style={{ gap: spacing.md }}>
              {bill.items.map((item) => {
                const sharers = item.sharedBy.length ? item.sharedBy : bill.participants.map((p) => p.id)
                return (
                  <View key={item.id} style={{ gap: spacing.sm }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Body style={{ fontWeight: '600', flex: 1 }}>{item.label}</Body>
                      <Body>{formatMoney(item.cents)}</Body>
                      <Button
                        title="✕"
                        variant="ghost"
                        compact
                        accessibilityLabel={`Remove ${item.label}`}
                        onPress={() => removeItem(bill.id, item.id)}
                      />
                    </Row>

                    <Row style={{ flexWrap: 'wrap' }}>
                      {bill.participants.map((person) => {
                        const on = sharers.includes(person.id)
                        const explicit = item.sharedBy.includes(person.id)
                        return (
                          <Pressable
                            key={person.id}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: explicit }}
                            accessibilityLabel={`${person.name} shares ${item.label}`}
                            onPress={() => toggleSharer(bill.id, item.id, person.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.xs + 2,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: on ? colors.accent : colors.border,
                              backgroundColor: explicit ? colors.accent : 'transparent',
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Body
                              style={{
                                fontSize: 13,
                                color: explicit ? colors.onAccent : on ? colors.accent : colors.textSoft,
                              }}
                            >
                              {person.name}
                            </Body>
                          </Pressable>
                        )
                      })}
                    </Row>

                    <Body tone="soft" style={{ fontSize: 12 }}>
                      {item.sharedBy.length === 0
                        ? `Split between everyone · ${formatMoney(Math.floor(item.cents / Math.max(1, bill.participants.length)))} each`
                        : `${item.sharedBy.length} of ${bill.participants.length}`}
                    </Body>
                    <Divider />
                  </View>
                )
              })}
            </View>
          )}

          <Row style={{ alignItems: 'flex-end' }}>
            <Field label="Item" placeholder="Pasta" value={label} onChangeText={setLabel} />
            <Field
              label="Price"
              placeholder="12.50"
              value={amount}
              onChangeText={(value) => {
                setAmount(value)
                setAmountError(null)
              }}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onSubmitEditing={submitItem}
              style={{ maxWidth: 110 }}
            />
            <Button title="Add" accessibilityLabel="Add item" compact onPress={submitItem} />
          </Row>
          {amountError ? <Body tone="danger">{amountError}</Body> : null}
        </Card>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Label>RUNNING TOTAL</Label>
              <Title>{formatMoney(settlement.total)}</Title>
            </View>
            <Link href={`/bill/${bill.id}/summary`} asChild>
              <Button
                title="Who owes what"
                accessibilityLabel="Open the summary"
                disabled={bill.participants.length === 0}
              />
            </Link>
          </Row>
        </Card>

        <Button
          title="Delete this bill"
          variant="ghost"
          onPress={() =>
            confirmRemoval(bill.title, bill.items.length, () => {
              removeBill(bill.id)
              router.replace('/')
            })
          }
        />
      </ScrollView>
    </Screen>
  )
}
