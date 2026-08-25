
-- Allow users to delete conversations they're part of
CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow deleting messages in own conversations
CREATE POLICY "Users can delete messages in own conversations" ON public.messages
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
