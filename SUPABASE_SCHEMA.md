# Supabase Schema for Saved Readings

## Table: `tarot_readings`

This table stores user tarot readings for the Saved Readings / History feature.

### SQL Schema

```sql
-- Create tarot_readings table
CREATE TABLE IF NOT EXISTS public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spread_type INTEGER NOT NULL, -- 1, 3, or 5 (number of cards in spread)
  cards JSONB NOT NULL, -- Array of card objects: [{ id: 'the-fool', reversed: false }, ...]
  question TEXT, -- User's question (optional)
  interpretation TEXT, -- AI interpretation (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_tarot_readings_user_id ON public.tarot_readings(user_id);
CREATE INDEX idx_tarot_readings_created_at ON public.tarot_readings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own readings
CREATE POLICY "Users can view their own readings"
  ON public.tarot_readings
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own readings
CREATE POLICY "Users can insert their own readings"
  ON public.tarot_readings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own readings
CREATE POLICY "Users can update their own readings"
  ON public.tarot_readings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own readings
CREATE POLICY "Users can delete their own readings"
  ON public.tarot_readings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tarot_readings_updated_at
  BEFORE UPDATE ON public.tarot_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | Foreign key to `auth.users(id)` |
| `spread_type` | INTEGER | Number of cards: 1, 3, or 5 |
| `cards` | JSONB | Array of card objects with `id` and `reversed` fields |
| `question` | TEXT | User's question (optional) |
| `interpretation` | TEXT | AI interpretation result (optional) |
| `created_at` | TIMESTAMPTZ | Reading creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Example Data

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "987fcdeb-51a2-43c1-9876-ba9876543210",
  "spread_type": 3,
  "cards": [
    { "id": "the-fool", "reversed": false },
    { "id": "the-magician", "reversed": true },
    { "id": "the-high-priestess", "reversed": false }
  ],
  "question": "What should I focus on today?",
  "interpretation": "The Fool suggests new beginnings...",
  "created_at": "2026-03-18T10:30:00Z",
  "updated_at": "2026-03-18T10:30:00Z"
}
```

## Integration Points

### Saving a Reading (in TarotOraclePage.vue)

After completing a tarot reading with AI interpretation, save it:

```javascript
const saveReading = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('tarot_readings')
    .insert({
      user_id: user.id,
      spread_type: selectedSpread.value, // 1, 3, or 5
      cards: spreadCards.value.map(card => ({
        id: card.id,
        reversed: card.reversed || false
      })),
      question: draftQuestion.value || null,
      interpretation: interpretationText.value || null
    })

  if (error) {
    console.error('Save reading error:', error)
  }
}
```

### Loading Readings (in SavedReadingsPage.vue)

Already implemented in the page component.

## User Authentication Handling

The SavedReadingsPage handles both logged-in and logged-out states:

- **Logged out**: Shows "Sign in to see your readings" with a "Sign in" button
- **Logged in, no readings**: Shows "No readings yet" with a "Start a reading" button
- **Logged in, with readings**: Shows the list of readings

## Next Steps

1. **Run the SQL schema** in Supabase SQL Editor
2. **Test RLS policies** by creating/reading/deleting readings
3. **Integrate save logic** in TarotOraclePage.vue after AI interpretation completes
4. **Add analytics** for tracking reading creation events
5. **Consider limits** for free users (e.g., max 50 readings, premium = unlimited)

## FAQ

**Q: What happens if the user is not logged in?**
A: The page shows a special empty state: "Sign in to see your readings" with a button to navigate to login page.

**Q: Can guest users save readings?**
A: No. Readings require authentication and are tied to `user_id` in the database.
