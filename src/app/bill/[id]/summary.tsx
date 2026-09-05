import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Switch, View } from 'react-native'
import { Body, Button, Card, Divider, EmptyState, Field, Label, Row, Screen, Title } from '../../../components/ui'
import { formatMoney, parseAmount } from '../../../lib/money'
import { settle, settlementText } from '../../../lib/settle'
import { shareMethod, shareText } from '../../../lib/share'
import { spacing, useTheme } from '../../../lib/theme'
import { useBills } from '../../../store/bills'

const TIP_PRESETS = [0, 5, 10, 15]

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colors = useTheme()
  const router = useRouter()

  const bill = useBills((state) => state.bills.find((item) => item.id === id))
  const { setTip, setServicePercent, setRoundUp, repeatCompany } = useBills.getState()

  const [customTip, setCustomTip] = useState('')
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')

  const settlement = useMemo(() => (bill ? settle(bill) : null), [bill])

  if (!bill || !settlement) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="That bill is gone"
            hint="Nothing to add up. The list of bills is still there."
            action={<Button title="Back to bills" onPress={() => router.replace('/')} />}
          />
        </View>
      </Screen>
    )
  }

  const text = settlementText(bill, settlement, (cents) => formatMoney(cents))

  const onShare = async () => {
    setShareState('working')
    try {
      const result = await shareText(text, bill.title)
      setShareState(result === 'shared' ? 'done' : 'idle')
    } catch {
      setShareState('failed')
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: bill.title }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 }}>
        <Card>
          <Title>Tip and service</Title>

          <Label>TIP</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {TIP_PRESETS.map((percent) => {
              const active = bill.tip.kind === 'percent' && bill.tip.value === percent
              return (
                <Pressable
                  key={percent}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Tip ${percent} percent`}
                  onPress={() => {
                    setTip(bill.id, { kind: 'percent', value: percent })
                    setCustomTip('')
                  }}
                  style={{
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accent : 'transparent',
                  }}
                >
                  <Body style={{ color: active ? colors.onAccent : colors.textSoft }}>
                    {percent}%
                  </Body>
                </Pressable>
              )
            })}
          </Row>

          <Row style={{ alignItems: 'flex-end' }}>
            <Field
              label="Or a fixed amount"
              placeholder="5.00"
              value={customTip}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setCustomTip(value)
                const cents = parseAmount(value)
                if (cents !== null) setTip(bill.id, { kind: 'amount', value: cents })
              }}
              style={{ maxWidth: 140 }}
            />
            <Field
              label="Service %"
              placeholder="0"
              value={String(bill.servicePercent || '')}
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={(value) => setServicePercent(bill.id, Math.min(100, Number(value) || 0))}
              style={{ maxWidth: 90 }}
            />
          </Row>

          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Body>Round every share up</Body>
              <Body tone="soft" style={{ fontSize: 13 }}>
                Each person pays a whole {formatMoney(100).replace(/[\d.,]/g, '').trim()}1; the
                difference is added to the tip.
              </Body>
            </View>
            <Switch
              value={bill.roundUp}
              onValueChange={(value) => setRoundUp(bill.id, value)}
              accessibilityLabel="Round every share up to a whole unit"
            />
          </Row>
        </Card>

        <Card>
          <Title>Who owes what</Title>
          {settlement.shares.length === 0 ? (
            <Body tone="soft">Nobody is on this bill yet.</Body>
          ) : (
            settlement.shares.map((share) => (
              <View key={share.participantId} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '600' }}>{share.name}</Body>
                  <Body style={{ fontWeight: '700' }}>{formatMoney(share.total)}</Body>
                </Row>
                <Body tone="soft" style={{ fontSize: 12 }}>
                  {formatMoney(share.items)} ordered
                  {share.service > 0 ? ` · ${formatMoney(share.service)} service` : ''}
                  {share.tip > 0 ? ` · ${formatMoney(share.tip)} tip` : ''}
                  {share.rounding > 0 ? ` · ${formatMoney(share.rounding)} rounding` : ''}
                </Body>
              </View>
            ))
          )}

          <Divider />

          <Row style={{ justifyContent: 'space-between' }}>
            <Body tone="soft">Items</Body>
            <Body>{formatMoney(settlement.subtotal)}</Body>
          </Row>
          {settlement.service > 0 ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Body tone="soft">Service</Body>
              <Body>{formatMoney(settlement.service)}</Body>
            </Row>
          ) : null}
          {settlement.tip > 0 ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Body tone="soft">Tip</Body>
              <Body>{formatMoney(settlement.tip)}</Body>
            </Row>
          ) : null}
          {settlement.rounding > 0 ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Body tone="soft">Rounded up</Body>
              <Body>{formatMoney(settlement.rounding)}</Body>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <Title style={{ fontSize: 17 }}>Total</Title>
            <Title style={{ fontSize: 17 }}>{formatMoney(settlement.total)}</Title>
          </Row>
          <Body tone="soft" style={{ fontSize: 12 }}>
            The shares add up to the total exactly — the odd cents are handed out, not rounded away.
          </Body>
        </Card>

        <Card>
          <Title style={{ fontSize: 17 }}>Send it to the table</Title>
          <Body tone="soft" style={{ fontSize: 13 }}>
            {shareMethod === 'clipboard'
              ? 'This build copies the summary to the clipboard when the browser has no share sheet.'
              : 'Opens the system share sheet with the breakdown as plain text.'}
          </Body>
          <View
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: 10,
              padding: spacing.md,
            }}
          >
            <Body style={{ fontSize: 13, fontFamily: 'monospace' }}>{text}</Body>
          </View>
          <Button
            title={shareState === 'working' ? 'Sharing…' : 'Share the summary'}
            onPress={onShare}
            disabled={shareState === 'working'}
          />
          {shareState === 'done' ? <Body tone="accent">Sent.</Body> : null}
          {shareState === 'failed' ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Body tone="danger" style={{ flex: 1 }}>
                Sharing did not work on this device. The text above can be copied by hand.
              </Body>
              <Button title="Try again" variant="outline" compact onPress={onShare} />
            </Row>
          ) : null}
        </Card>

        <Button
          title="Same company, new bill"
          variant="outline"
          onPress={() => {
            const next = repeatCompany(bill.id, `${bill.title} again`)
            router.replace(`/bill/${next}`)
          }}
        />
      </ScrollView>
    </Screen>
  )
}
