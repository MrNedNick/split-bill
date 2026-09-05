import { Link, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { Body, Button, Card, EmptyState, Field, Row, Screen, Skeleton, Title } from '../components/ui'
import { formatMoney } from '../lib/money'
import { settle } from '../lib/settle'
import { spacing, useTheme } from '../lib/theme'
import { useBills } from '../store/bills'

export default function BillsScreen() {
  const colors = useTheme()
  const router = useRouter()
  const bills = useBills((state) => state.bills)
  const hydrated = useBills((state) => state.hydrated)
  const createBill = useBills((state) => state.createBill)
  const [title, setTitle] = useState('')

  const rows = useMemo(
    () =>
      bills.map((bill) => ({
        bill,
        total: settle(bill).total,
        people: bill.participants.length,
      })),
    [bills],
  )

  const start = () => {
    const id = createBill(title)
    setTitle('')
    router.push(`/bill/${id}`)
  }

  return (
    <Screen>
      <View style={{ padding: spacing.lg, gap: spacing.lg, flex: 1 }}>
        <Card>
          <Title>Split a bill</Title>
          <Body tone="soft">
            Add who was there, what was ordered, and who shared what. Everything stays on this
            device — no account, no server.
          </Body>
          <Row>
            <Field
              label="New bill"
              placeholder="Dinner at Osteria"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={start}
              returnKeyType="done"
            />
          </Row>
          <Button title="Start a bill" onPress={start} />
        </Card>

        {!hydrated ? (
          <Skeleton lines={2} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No bills yet"
            hint="Start one above. Past bills stay here so you can reuse the same company next time."
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.bill.id}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
            ListHeaderComponent={<Body tone="soft">{rows.length} saved</Body>}
            renderItem={({ item }) => (
              <Link href={`/bill/${item.bill.id}`} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${item.bill.title}, ${item.people} people, ${formatMoney(item.total)}`}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: spacing.lg,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: '600' }}>{item.bill.title}</Body>
                      <Body tone="soft" style={{ fontSize: 13 }}>
                        {item.people} {item.people === 1 ? 'person' : 'people'} ·{' '}
                        {new Date(item.bill.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Body>
                    </View>
                    <Body style={{ fontWeight: '700' }}>{formatMoney(item.total)}</Body>
                  </Row>
                </Pressable>
              </Link>
            )}
          />
        )}
      </View>
    </Screen>
  )
}
