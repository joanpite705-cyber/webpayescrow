DROP POLICY IF EXISTS "Staff can send escrow messages" ON public.escrow_messages;
CREATE POLICY "Staff can send escrow messages"
ON public.escrow_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_admin_or_moderator()
);