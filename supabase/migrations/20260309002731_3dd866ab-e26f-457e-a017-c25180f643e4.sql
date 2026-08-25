
-- Função para adicionar coins de forma segura
CREATE OR REPLACE FUNCTION public.add_user_coins(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_wallets
  SET 
    coins = coins + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Se não existe wallet, criar uma
  IF NOT FOUND THEN
    INSERT INTO public.user_wallets (user_id, coins)
    VALUES (p_user_id, 50 + p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET coins = user_wallets.coins + p_amount, updated_at = now();
  END IF;
END;
$$;

-- Trigger: Recompensa por criar post (5 coins)
CREATE OR REPLACE FUNCTION public.reward_post_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_user_coins(NEW.user_id, 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_created_reward ON public.posts;
CREATE TRIGGER on_post_created_reward
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_post_coins();

-- Trigger: Recompensa por comentar (2 coins)
CREATE OR REPLACE FUNCTION public.reward_comment_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_user_coins(NEW.user_id, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_reward ON public.comments;
CREATE TRIGGER on_comment_created_reward
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_comment_coins();

-- Trigger: Recompensa por receber curtida (1 coin para o dono do post)
CREATE OR REPLACE FUNCTION public.reward_like_received_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  -- Buscar o dono do post
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Adicionar coins para o dono do post (não para quem deu like)
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    PERFORM public.add_user_coins(post_owner_id, 1);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_received_reward ON public.post_likes;
CREATE TRIGGER on_like_received_reward
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_like_received_coins();

-- Trigger: Recompensa por entrar em comunidade (10 coins)
CREATE OR REPLACE FUNCTION public.reward_join_community_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_user_coins(NEW.user_id, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_community_joined_reward ON public.community_members;
CREATE TRIGGER on_community_joined_reward
  AFTER INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_join_community_coins();

-- Trigger: Recompensa por criar story (20 coins apenas no primeiro)
CREATE OR REPLACE FUNCTION public.reward_story_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  story_count integer;
BEGIN
  -- Contar quantos stories o usuário já tem (incluindo o atual)
  SELECT COUNT(*) INTO story_count
  FROM public.stories
  WHERE user_id = NEW.user_id;
  
  -- Se for o primeiro story, dar 20 coins
  IF story_count = 1 THEN
    PERFORM public.add_user_coins(NEW.user_id, 20);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_story_created_reward ON public.stories;
CREATE TRIGGER on_story_created_reward
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_story_coins();

-- Trigger: Recompensa por desbloquear badge (15 coins)
CREATE OR REPLACE FUNCTION public.reward_badge_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas dar coins se for badge de missão ou automática
  IF NEW.source IN ('mission', 'automatic') THEN
    PERFORM public.add_user_coins(NEW.user_id, 15);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_badge_earned_reward ON public.user_badges;
CREATE TRIGGER on_badge_earned_reward
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_badge_coins();

-- Trigger: Recompensa por referral (30 coins para o referrer)
CREATE OR REPLACE FUNCTION public.reward_referral_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_user_coins(NEW.referrer_id, NEW.coins_awarded);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referral_created_reward ON public.referrals;
CREATE TRIGGER on_referral_created_reward
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.reward_referral_coins();
