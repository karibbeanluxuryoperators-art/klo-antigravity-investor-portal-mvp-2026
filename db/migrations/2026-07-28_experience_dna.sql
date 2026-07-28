-- v1.8.0 Step 22: Experience DNA + Price Estimate
-- María bot captures a structured "DNA" of what each lead needs (pillar + type
-- + details) so the broker can re-contact with a price range in hand.
--
-- This is the data layer that powers the "min-interaction re-contact with
-- price estimate" flow: María only needs the lead's email/phone + 1-2 details
-- before offering an estimated USD range, and the full DNA is what makes that
-- estimate possible without a back-and-forth phone call.

ALTER TABLE leads
  -- Structured "DNA" of the experience: array of { pillar, type, details }
  --   e.g. [{ pillar: 'aviation', type: 'heavy_jet', details: { passengers: 6, route: 'MIA-CTG' } }, ...]
  ADD COLUMN IF NOT EXISTS experience_dna JSONB DEFAULT '[]'::jsonb,

  -- Maria's estimated price range in USD (lower + upper bound)
  --   e.g. { low: 18000, high: 35000, currency: 'USD', confidence: 'medium' }
  ADD COLUMN IF NOT EXISTS price_estimate_usd NUMERIC(12,2),

  -- Maria's confidence in the estimate (low | medium | high)
  --   low = only services mentioned, no passengers/dates
  --   medium = services + passengers
  --   high = services + passengers + dates + duration
  ADD COLUMN IF NOT EXISTS estimate_confidence TEXT CHECK (estimate_confidence IS NULL OR estimate_confidence IN ('low', 'medium', 'high')),

  -- How Maria learned the DNA: 'maria_chat' | 'manual_form' | 'phone_call' | 'whatsapp'
  ADD COLUMN IF NOT EXISTS dna_source TEXT DEFAULT 'maria_chat';

-- Index for fast lookup by source (used by the Maria panel to count today's leads)
CREATE INDEX IF NOT EXISTS idx_leads_dna_source ON leads (dna_source);
CREATE INDEX IF NOT EXISTS idx_leads_experience_dna_gin ON leads USING GIN (experience_dna);

-- Comment for the schema docs
COMMENT ON COLUMN leads.experience_dna IS 'Array of { pillar, type, details } objects capturing what the lead needs. Used by the broker to re-contact with a pre-priced proposal.';
COMMENT ON COLUMN leads.price_estimate_usd IS 'USD price estimate (single number, low-end of range) computed by Maria. The full range lives in price_estimate_range JSONB if needed later.';
COMMENT ON COLUMN leads.estimate_confidence IS 'How confident Maria is: low (services only), medium (+ passengers), high (+ dates + duration).';
COMMENT ON COLUMN leads.dna_source IS 'Where the DNA came from: maria_chat, manual_form, phone_call, whatsapp.';
