UPDATE srs_cards AS c
SET back_translation = CASE c.back_translation
  WHEN 'Infusión' THEN 'Infusão'
  WHEN 'Percepción' THEN 'Percepção'
  WHEN 'Entropía' THEN 'Entropia'
  WHEN 'Extracción' THEN 'Extração'
  ELSE c.back_translation
END
FROM users AS u
WHERE c.user_id = u.id
  AND u.native_lang = 'pt'
  AND c.back_translation IN ('Infusión', 'Percepción', 'Entropía', 'Extracción');

CREATE UNIQUE INDEX IF NOT EXISTS srs_cards_user_lang_phrase_idx
  ON srs_cards (user_id, target_lang, lower(front_phrase));
