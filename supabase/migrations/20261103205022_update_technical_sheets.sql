-- C11 / #81. Category arrays already validated by migration 01.
ALTER TABLE public.technical_sheets
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER technical_sheets_touch_updated_at
    BEFORE UPDATE ON public.technical_sheets FOR EACH ROW
    EXECUTE FUNCTION public.touch_updated_at();
-- UNIQUE(provider_id) is explicitly optional in the requirements; not imposed.
